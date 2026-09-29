import { IntentError } from '@/core/errors.js'
import { blake3 } from '@noble/hashes/blake3'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { DepDelta, DepDeltaNames } from '@/types/server-only-types.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceEdgeModel } from '@/models/source-graph/source-edge-model.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { DependenciesQueryService } from './query-service.js'
import { DepsJsonService } from '@/services/managed-files/deps/deps-json-service.js'

/** The shape `updateNodeDepDeltas` reads out of a node's jsonContent. */
interface DepsJson {
  source?: {
    deps?: Record<string, string | undefined>
  }
  [key: string]: unknown
}

/**
 * Whether a node's jsonContent is an object this service can edit the deps of.
 * A node carrying no jsonContent yet is not an error, it is simply empty.
 */
function isDepsJson(value: unknown): value is DepsJson {
  return value != null && typeof value === 'object'
}

// Models
const sourceEdgeModel = new SourceEdgeModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesQueryService = new DependenciesQueryService()
const depsJsonService = new DepsJsonService()

// Class
export class DependenciesMutateService {

  // Consts
  clName = 'DependenciesMutateService'

  // Code
  async delDep(
          store: ProjectStore,
          depsNode: SourceNodeRecord,
          intentFileNode: SourceNodeRecord,
          name: string) {

    // Try to get by unique key
    const depEdge = await
            sourceEdgeModel.getByUniqueKey(
              store,
              intentFileNode.id,
              depsNode.id,
              name)

    if (depEdge == null) {
      return
    }

    // Delete edge
    await sourceEdgeModel.deleteById(
            store,
            depEdge.id)
  }

  async getOrCreateDepsNode(
          store: ProjectStore,
          projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getOrCreateDepsNode()`

    // Validate
    if (projectNode.type !== SourceNodeTypes.project) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: projectNode.type !== SourceNodeTypes.project`
      })
    }

    // Try to get the existing node
    var depsNode = await
          dependenciesQueryService.getDepsNode(
            store,
            projectNode)

    if (depsNode != null) {
      return depsNode
    }

    depsNode = await
      sourceNodeModel.create(
        store,
        projectNode.id,  // parentId
        projectNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.deps,
        SourceNodeNames.depsName,
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return depsNode
  }

  async processDeps(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          intentFileNode: SourceNodeRecord,
          depDeltas: DepDelta[]) {

    // Debug
    const fnName = `${this.clName}.processDeps()`

    // Validate
    if (depDeltas == null) {
      return
    }

    if (intentFileNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: intentFileNode == null`
      })
    }

    // Get/create deps node
    const depsNode = await
            this.getOrCreateDepsNode(
              store,
              projectNode)

    // Update jsonContent of intentFileNode
    await this.updateNodeDepDeltas(
            store,
            intentFileNode,
            depDeltas)

    // Update jsonContent of depsNode
    await this.updateNodeDepDeltas(
            store,
            depsNode,
            depDeltas)

    // Update each dep
    for (const depDelta of depDeltas) {

      if (depDelta.delta === DepDeltaNames.set) {

        await this.setDep(
                store,
                depsNode,
                intentFileNode,
                depDelta.name)

      } else if (depDelta.delta === DepDeltaNames.del) {

        await this.delDep(
                store,
                depsNode,
                intentFileNode,
                depDelta.name)
      }
    }

    // Write the updated deps.json file
    await depsJsonService.writeToFile(
            store,
            projectNode,
            depsNode)
  }

  async setDep(
          store: ProjectStore,
          depsNode: SourceNodeRecord,
          intentFileNode: SourceNodeRecord,
          name: string) {

    // Upsert edge
    const depEdge = await
            sourceEdgeModel.upsert(
              store,
              undefined,  // id
              intentFileNode.id,
              depsNode.id,
              BaseDataTypes.activeStatus,
              name)
  }

  async updateDepsNode(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          depsNode: SourceNodeRecord,
          writeToDepsJson: boolean = true) {

    // Get contentHash
    depsNode.contentHash = null

    if (depsNode.content != null) {

      depsNode.contentHash =
        blake3(JSON.stringify(depsNode.content)).toString()
    }

    // Get jsonContentHash
    depsNode.jsonContentHash = null

    if (depsNode.jsonContent != null) {

      depsNode.jsonContentHash =
        blake3(JSON.stringify(depsNode.jsonContent)).toString()
    }

    // Update
    depsNode = await
      sourceNodeModel.update(
        store,
        depsNode.id,
        depsNode.parentId,
        depsNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.deps,
        SourceNodeNames.depsName,
        depsNode.content,
        depsNode.contentHash,
        depsNode.jsonContent,
        depsNode.jsonContentHash,
        depsNode.contentUpdated == null
          ? null
          : new Date(depsNode.contentUpdated))

    // Write deps.json
    if (writeToDepsJson === true) {

      await depsJsonService.writeToFile(
              store,
              projectNode,
              depsNode)
    }
  }

  async updateNodeDepDeltas(
          store: ProjectStore,
          node: SourceNodeRecord,
          depDeltas: DepDelta[]) {

    // Update jsonContent as depsJson
    const cloned: unknown = structuredClone(node.jsonContent)
    const depsJson: DepsJson = isDepsJson(cloned) ? cloned : {}

    if (depsJson.source == null) {
      depsJson.source = {}
    }

    if (depsJson.source.deps == null) {
      depsJson.source.deps = {}
    }

    // Process each delta
    for (const depDelta of depDeltas) {

      // Don't remove deps for the project's deps node
      if (node.type !== SourceNodeTypes.deps &&
          depDelta.delta === DepDeltaNames.del) {

        depsJson.source.deps[depDelta.name] = undefined
      }

      // Set deps
      if (depDelta.delta === DepDeltaNames.set) {

        depsJson.source.deps[depDelta.name] = depDelta.minVersion
      }
    }

    // Get depsJsonHash
    const depsJsonHash = blake3(JSON.stringify(depsJson)).toString()

    // Upsert IntentFileNode
    node = await
      sourceNodeModel.setJsonContent(
        store,
        node.id,
        depsJson,
        depsJsonHash)
  }
}
