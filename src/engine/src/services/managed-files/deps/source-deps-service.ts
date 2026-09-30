import { IntentError } from '@/core/errors.js'
import type { NodeContent, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service.js'
import { BuildData, DepsTools } from '@/types/build-types.js'
import { ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import type { DepsData } from '@/types/source-graph-types.js'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service.js'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service.js'
import { PackageJsonFileMutateService } from '../package-json/mutate-service.js'

// Services
const dependenciesMutateService = new DependenciesMutateService()
const dependenciesQueryService = new DependenciesQueryService()
const extensionQueryService = new ExtensionQueryService()
const packageJsonFileMutateService = new PackageJsonFileMutateService()

// Class
export class SourceDepsFileService {

  // Consts
  clName = 'SourceDepsFileService'

  // Code
  async inferPackageManagerFromExtensions(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          depsNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.inferPackageManagerFromExtensions()`

    // Get system extensions
    const extensionsData = await
            extensionQueryService.loadExtensions(
              store,
              projectNode.projectId)

    // Validate
    if (extensionsData == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsData == null'
      })
    }

    // Output
    console.log(
      `Inferring package manager from ${extensionsData.hooksNodes.length} ` +
      `extension hooks..`)

    // Look for one that specifies a package manager
    let packageManager: string | undefined = undefined

    for (const hooksNode of extensionsData.hooksNodes) {

      // Debug
      // console.log(`${fnName}: hooksNode.jsonContent: ` +
      //             JSON.stringify(hooksNode.jsonContent))

      // Is a packageManager specified?
      // A hooks file is free to declare no deps at all: the bundled ones
      // happen to name a package manager, an extension carrying only skills
      // does not. Reading through a missing `deps` threw a TypeError that
      // took the whole build down over an unrelated extension.
      const hooksJson = hooksNode.jsonContent as
        { deps?: { packageManager?: unknown } } | null

      const declared = hooksJson?.deps?.packageManager

      if (declared != null) {

        packageManager = String(declared)
        break
      }
    }

    // Output
    console.log(`.. found packageManager: ${packageManager}`)

    // Validate
    if (packageManager == null) {
      return
    }

    // Set in depsNode. The node is created empty, so on a project that has
    // never recorded a dependency its jsonContent is still null: writing
    // through it threw a TypeError on the one path that exists to populate
    // it in the first place.
    const depsJson = (depsNode.jsonContent ?? {}) as DepsData

    if (depsJson.source == null) {
      depsJson.source = {}
    }

    depsJson.source.packageManager = packageManager

    depsNode.jsonContent = depsJson as DepsData & NodeContent

      // Update depsNode
      await dependenciesMutateService.updateDepsNode(
              store,
              projectNode,
              depsNode,
              true)  // writeToDepsJson
  }

  async updateAndWriteFile(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.updateAndWriteFile()`

    // Get Deps node
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              store,
              projectNode)

    // Validate
    if (depsNode == null) {

      console.log(
        `No deps setup.\n` +
        `This is usually done when installing a required extension with a ` +
        `hooks file.`)

      process.exit(1)
    }

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: depsNode.jsonContent: ` +
        JSON.stringify(depsNode.jsonContent))
    }

    // The engine's view of the project's dependencies. The node is created
    // empty, so the content is absent until something is added to it.
    const depsData = (depsNode.jsonContent ?? {}) as DepsData

    if (depsData.source?.packageManager == null) {

      // Infer a package manager from the available extensions
      await this.inferPackageManagerFromExtensions(
              store,
              projectNode,
              depsNode)

      // Failed?
      // inferPackageManagerFromExtensions() writes the package manager back
      // to the node, so the content is re-read rather than trusting the copy
      // taken before the call.
      const inferred =
        (depsNode.jsonContent ?? {}) as DepsData

      if (inferred.source?.packageManager == null) {

        console.log(
          `No source package manager specified.\n` +
          `This is usually done when installing a required extension with a ` +
          `hooks file.`)

        process.exit(1)
      }
    }

    // Process by tool name
    switch ((depsNode.jsonContent as DepsData).source?.packageManager) {

      case DepsTools.npm: {
        await packageJsonFileMutateService.run(
                store,
                buildData,
                projectNode,
                depsNode)

        break
      }

      default: {
        console.log(
          `Unhandled deps tool: ` +
          `${(depsNode.jsonContent as DepsData).source?.packageManager}`)

        process.exit(1)
      }
    }
  }
}
