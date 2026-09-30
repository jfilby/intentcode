import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BuildData } from '@/types/build-types.js'
import { DepsData, ExtensionsData } from '@/types/source-graph-types.js'
import { ExtensionMutateService } from '@/services/extensions/extension/mutate-service.js'
import { LoadExternalExtensionsService } from
  '@/services/extensions/extension/load-external-service.js'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service.js'
import { ProjectSetupService } from '@/services/projects/setup-project.js'
import { SourceDepsFileService } from './source-deps-service.js'
import { ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'

// Services
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const projectSetupService = new ProjectSetupService()
const sourceDepsFileService = new SourceDepsFileService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()

/** The part of an extension node's jsonContent this service reads. */
type ExtensionNodeContent = {
  id?: string
}

// Class
export class DepsSyncService {

  // Consts
  clName = 'DepsSyncService'

  // Code
  checkExtensionInExtensionsData(
    extensionId: string,
    extensionsData: ExtensionsData) {

    // Check every extension in the graph
    for (const extensionNode of extensionsData.extensionNodes) {

      // Debug
      // console.log(`${fnName}: checking ` +
      //   `${(extensionNode.jsonContent as any).id}`)

      // Check
      if ((extensionNode.jsonContent as ExtensionNodeContent).id ===
          extensionId) {
        return true
      }
    }

    return false
  }

  async deleteExtensionsNotInDepsNode(
    store: ProjectStore,
    extensionsData: ExtensionsData,
    depsNodeExtensions: Record<string, string>) {

    // Debug
    const fnName = `${this.clName}.deleteExtensionsNotInDepsNode()`

    // console.log(`${fnName}: starting with depsNodeExtensions: ` +
    //   JSON.stringify(depsNodeExtensions))

    // Iterate project extensions (from project graph)
    for (const extensionNode of extensionsData.extensionNodes) {

      // Debug
      console.log(`${fnName}: checking extensionNode..`)

      // Get id
      const extensionId =
        (extensionNode.jsonContent as ExtensionNodeContent).id

      // Check if extension in depsNode
      let inDepsNode = false

      for (const id of Object.keys(depsNodeExtensions)) {

        if (id === extensionId) {
          inDepsNode = true
        }
      }

      // If extension not in depsNode delete it
      if (inDepsNode === false) {

        // Verbose
        if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
          console.log(`Deleting extension not in deps.json: ${extensionId}`)
        }

        // Delete
        await extensionMutateService.deleteExtension(
          store,
          extensionNode.id)
      }
    }
  }

  async loadExtensionsFromDepsNode(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          extensionsData: ExtensionsData,
          depsNodeExtensions: Record<string, string>) {

    // console.log(`${fnName}: starting..`)

    // Validate
    if (Array.isArray(depsNodeExtensions)) {

      console.error(`Extensions from deps.json isn't a map`)
      process.exit(1)
    }

    // Iterate depsNode extensions
    for (const id of Object.keys(depsNodeExtensions)) {

      // Debug
      // console.log(`${fnName}: checking if ${id} is loaded..`)

      // Check if the extension exists in the graph
      if (!this.checkExtensionInExtensionsData(
        id,
        extensionsData)) {

        // Debug
        // console.log(`${fnName}: loading extensions ${id}..`)

        await loadExternalExtensionsService.loadBundledExtensionsByName(
          store,
          projectNode.projectId,
          [id])
      }
    }
  }

  async update(
    store: ProjectStore,
    buildData: BuildData,
    projectNode: SourceNodeRecord) {

    // Load any new extensions. A project with no deps.json has nothing to
    // load, which is a project that has declared no dependencies.
    const depsNode = await
      projectSetupService.loadDepsConfigFile(store, projectNode)

    if (depsNode != null) {
      await this.syncExtensions(store, projectNode, depsNode)
    }

    // Update and write the package manager file
    await sourceDepsFileService.updateAndWriteFile(
      store,
      buildData,
      projectNode)
  }

  async syncExtensions(
    store: ProjectStore,
    projectNode: SourceNodeRecord,
    depsNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.syncExtensions()`

    // Get extensions in the project
    const projectExtensionsData = await
      extensionQueryService.loadExtensions(
        store,
        projectNode.projectId)

    // Validate
    if (projectExtensionsData?.extensionNodes == null) {

      console.error(`Extensions not setup for project with projectId: ` +
        `${projectNode.projectId}`)

      process.exit(1)
    }

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: projectExtensionsData.extensionNodes: ` +
        `${projectExtensionsData.extensionNodes.length}`)
    }

    // Get depsNode extensions
    const depsNodeExtensions =
      (depsNode?.jsonContent as DepsData | null)?.extensions

    // Try to load any extensions not in the project
    if (depsNodeExtensions != null) {

      await this.loadExtensionsFromDepsNode(
        store,
        projectNode,
        projectExtensionsData,
        depsNodeExtensions)
    }

    // Try to delete any extensions not in the new depsNode. Only prune when
    // deps.json actually carries an extensions map: a Deps node with no
    // 'extensions' key is the normal state for a project that has not named
    // any, and passing undefined through here both threw on
    // Object.entries(undefined) and cascade-deleted every one of the
    // project's extensions.
    if (depsNodeExtensions != null) {

      await this.deleteExtensionsNotInDepsNode(
        store,
        projectExtensionsData,
        depsNodeExtensions)
    }
  }
}
