import type { ProjectStore } from '@/core/store.js'
import { SourceEdgeModel } from '@/models/source-graph/source-edge-model.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceEdgeModel = new SourceEdgeModel()
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Class
export class GraphsDeleteService {

  // Consts
  clName = 'GraphsDeleteService'

  // Code
  async deleteSourceNodeCascade(
          store: ProjectStore,
          sourceNodeId: string,
          deleteThisNode: boolean = true) {

    // Debug
    const fnName = `${this.clName}.deleteSourceNodeCascade()`

    // console.log(`${fnName}: starting with sourceNodeId: ${sourceNodeId}`)

    // Get child nodes
    const childNodes = await
            sourceNodeModel.filter(
              store,
              sourceNodeId)  // parentId

    // Delete edges (doesn't cascade to connected nodes)
    const edgesOut = await
            sourceEdgeModel.filter(
              store,
              sourceNodeId)  // fromId

    for (const edgeOut of edgesOut) {

      await sourceEdgeModel.deleteById(
              store,
              edgeOut.id)
    }

    const edgesIn = await
            sourceEdgeModel.filter(
              store,
              undefined,     // fromId
              sourceNodeId)  // toId

    for (const edgeIn of edgesIn) {

      await sourceEdgeModel.deleteById(
              store,
              edgeIn.id)
    }

    // Cascade to child nodes
    for (const childNode of childNodes) {

      await this.deleteSourceNodeCascade(
              store,
              childNode.id,
              true)
    }

    // Delete this node?
    if (deleteThisNode === true) {

      // Delete SourceNodeGenerations
      await sourceNodeGenerationModel.deleteBySourceNodeId(
        store,
        sourceNodeId)

      // Delete SourceNode
      await sourceNodeModel.deleteById(
        store,
        sourceNodeId)
    }
  }
}
