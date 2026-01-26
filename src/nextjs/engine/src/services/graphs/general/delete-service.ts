import { PrismaClient } from "@prisma/client"
import { SourceEdgeModel } from "@/models/source-graph/source-edge-model"
import { SourceNodeGenerationModel } from "@/models/source-graph/source-node-generation-model"
import { SourceNodeModel } from "@/models/source-graph/source-node-model"

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
          prisma: PrismaClient,
          sourceNodeId: string,
          deleteThisNode: boolean = true) {

    // Debug
    const fnName = `${this.clName}.deleteSourceNodeCascade()`

    // console.log(`${fnName}: starting with sourceNodeId: ${sourceNodeId}`)

    // Get child nodes
    const childNodes = await
            sourceNodeModel.filter(
              prisma,
              sourceNodeId)  // parentId

    // Delete edges (doesn't cascade to connected nodes)
    const edgesOut = await
            sourceEdgeModel.filter(
              prisma,
              sourceNodeId)  // fromId

    for (const edgeOut of edgesOut) {

      await sourceEdgeModel.deleteById(
              prisma,
              edgeOut.id)
    }

    const edgesIn = await
            sourceEdgeModel.filter(
              prisma,
              undefined,     // fromId
              sourceNodeId)  // toId

    for (const edgeIn of edgesIn) {

      await sourceEdgeModel.deleteById(
              prisma,
              edgeIn.id)
    }

    // Cascade to child nodes
    for (const childNode of childNodes) {

      await this.deleteSourceNodeCascade(
              prisma,
              childNode.id,
              true)
    }

    // Delete this node?
    if (deleteThisNode === true) {

      // Delete SourceNodeGenerations
      await sourceNodeGenerationModel.deleteBySourceNodeId(
        prisma,
        sourceNodeId)

      // Delete SourceNode
      await sourceNodeModel.deleteById(
        prisma,
        sourceNodeId)
    }
  }
}
