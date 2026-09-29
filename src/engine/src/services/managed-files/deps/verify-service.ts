import semver from 'semver'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service.js'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service.js'
import { DepsJsonService } from './deps-json-service.js'
import { JsonUtilsService } from '@/services/utils/json-service.js'

// Services
const depsJsonService = new DepsJsonService()
const dependenciesMutateService = new DependenciesMutateService()
const dependenciesQueryService = new DependenciesQueryService()
const jsonUtilsService = new JsonUtilsService()

// Class
export class DepsVerifyService {

  // Consts
  clName = 'DepsVerifyService'

  // Code
  async verifyDepsNode(
    store: ProjectStore,
    projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.verifyDepsNode()`

    // Get Deps node
    const depsNode = await
      dependenciesQueryService.getDepsNode(
        store,
        projectNode)
    // A project with no deps node has declared no dependencies, which is a
    // project that has nothing to verify.
    if (depsNode == null) return

    // Verify depsNode dependencies
    await this.verifyDepsNodeDependencies(
      store,
      projectNode,
      depsNode)

    // Verify depsNode matches deps.json
    await this.verifyDepsNodeSyncedToDepsJson(
      store,
      projectNode,
      depsNode)
  }

  async verifyDepsNodeDependencies(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          depsNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.verifyDepsNodeDependencies()`

    // Validate
    if (depsNode?.jsonContent == null) {
      return
    }

    // Get jsonContent as any
    const jsonContent = (depsNode.jsonContent) as any

    // Validate
    if (jsonContent.source?.packageManager == null ||
        jsonContent.source.packageManager !== 'npm' ||
        jsonContent.source?.deps == null) {

      return
    }

    // Debug
    // console.log(`${fnName}: depsNode.jsonContent.source.deps: ` +
    //   JSON.stringify(jsonContent.source.deps))

    // Verify semvers
    var modified = false

    for (const [packageName, minVersionNo] of
         Object.entries(jsonContent.source.deps)) {

      if (!semver.validRange(minVersionNo as string)) {

        if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

          console.log(
            `DepsNode dependency: ${packageName} has an invalid ` +
            `minVersionNo: ${minVersionNo} (removing..)`)
        }

        modified = true
        jsonContent.source.deps[packageName] = undefined
      }
    }

    // Debug
    // console.log(`${fnName}: depsNode.jsonContent.source.deps: ` +
    //   JSON.stringify(jsonContent.source.deps))

    // Save?
    if (modified === true) {

      depsNode.jsonContent = jsonContent

      await dependenciesMutateService.updateDepsNode(
              store,
              projectNode,
              depsNode,
              true)  // writeToDepsJson
    }
  }

  async verifyDepsNodeSyncedToDepsJson(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          depsNode: SourceNodeRecord,
          writeIfFileNotFound: boolean = true) {

    // Debug
    const fnName = `${this.clName}.verifyDepsNodeSyncedToDepsJson()`

    // Read deps.json
    const { found, data, filename } = await
            depsJsonService.readFile(
              store,
              projectNode)

    // File not found?
    if (found === false) {

      // Write file if not found?
      if (writeIfFileNotFound === true) {

        await depsJsonService.writeToFile(
                store,
                projectNode,
                depsNode)
      }

      // Done
      return
    }

    // Verify that they're the same
    if (jsonUtilsService.compareObjects(
          depsNode.jsonContent,
          data) === false) {

      console.log(`${fnName}: depsNode.id: ${depsNode.id}`)
      console.log(`${fnName}: depsNode.jsonContent: ` + typeof depsNode.jsonContent)
      console.log(`${fnName}: depsNode.jsonContent: ` +
        JSON.stringify(depsNode.jsonContent))

      console.log(`${fnName}: ${filename}`)
      console.log(`${fnName}: deps.json file: ` + typeof data)
      console.log(`${fnName}: deps.json file: ` + JSON.stringify(data))

      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: 'depsNode (jsonContent) !== deps.json'
      })
    }
  }
}
