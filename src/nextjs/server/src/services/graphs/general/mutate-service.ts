import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class GraphsMutateService {

  // Consts
  clName = 'GraphsMutateService'

  // Code
  async copyNodesToProject(
          prisma: PrismaClient,
          fromProjectId: string,
          toProjectId: string,
          fromNodeId: string,
          parentFromNodeId: string | null | undefined = null) {

    // Note: any related edges are not copied

    // Debug
    const fnName = `${this.clName}.copyNodesToProject()`

    // Validate
    if (fromProjectId == null) {
      throw new CustomError(`${fnName}: fromProjectId == null`)
    }

    if (toProjectId == null) {
      throw new CustomError(`${fnName}: toProjectId == null`)
    }

    if (fromNodeId == null) {
      throw new CustomError(`${fnName}: fromNodeId == null`)
    }

    // Get the from node
    const fromNode = await
            sourceNodeModel.getById(
              prisma,
              fromNodeId)

    // Create the extension node
    const toNode = await
            sourceNodeModel.upsert(
              prisma,
              undefined,         // id
              parentFromNodeId,  // parentId
              toProjectId,
              BaseDataTypes.activeStatus,
              fromNode.type,
              fromNode.name,
              fromNode.content,
              fromNode.contentHash,
              fromNode.jsonContent,
              fromNode.jsonContentHash,
              fromNode.contentUpdated)

    // Get child nodes
    const fromChildNodes = await
            sourceNodeModel.filter(
              prisma,
              fromNode.id)  // parentId

    // Copy child nodes
    for (const fromChildNode of fromChildNodes) {

      // Cascade the copy to the from child node
      await this.copyNodesToProject(
              prisma,
              fromProjectId,
              toProjectId,
              fromChildNode.id,
              fromNodeId)  // parentFromNodeId
    }
  }
}
