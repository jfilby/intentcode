import { IntentError } from '@/core/errors.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class GraphsMutateService {

  // Consts
  clName = 'GraphsMutateService'

  // Code
  async copyNodesToProject(
          fromStore: ProjectStore,
          toStore: ProjectStore,
          toProjectId: string,
          fromNodeId: string,
          parentToNodeId: string | null | undefined = null) {

    // Note: any related edges are not copied

    // Debug
    const fnName = `${this.clName}.copyNodesToProject()`

    // Validate
    if (toProjectId == null) {
      throw new IntentError({
        category: 'ProjectError',
        stage: fnName,
        message: `${fnName}: toProjectId == null`
      })
    }

    if (fromNodeId == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: fromNodeId == null`
      })
    }

    // Get the from node
    const fromNode = await
            sourceNodeModel.getById(
              fromStore,
              fromNodeId)

    // Validate
    if (fromNode == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: fromNode == null`,
        detail: `no source node with id ${fromNodeId}`
      })
    }

    if (fromNode.parentId === parentToNodeId) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: fromNode.parentId === parentToNodeId`
      })
    }

    // Create the extension node
    const toNode = await
            sourceNodeModel.upsert(
              toStore,
              undefined,         // id
              parentToNodeId,    // parentId
              toProjectId,
              BaseDataTypes.activeStatus,
              fromNode.type,
              fromNode.name,
              fromNode.content,
              fromNode.contentHash,
              fromNode.jsonContent,
              fromNode.jsonContentHash,
              fromNode.contentUpdated == null
                ? null
                : new Date(fromNode.contentUpdated))

    // Debug
    // console.log(`${fnName}: copied from ${fromNode.id} to ${toNode.id}`)

    // Get child nodes
    const fromChildNodes = await
            sourceNodeModel.filter(
              fromStore,
              fromNode.id)  // parentId

    // Copy child nodes
    for (const fromChildNode of fromChildNodes) {

      // Cascade the copy to the from child node
      await this.copyNodesToProject(
              fromStore,
              toStore,
              toProjectId,
              fromChildNode.id,
              toNode.id)  // parentToNodeId
    }
  }
}
