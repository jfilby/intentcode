import { PrismaClient, SourceNode } from '@prisma/client'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class DotIntentCodeGraphQueryService {

  // Consts
  clName = 'DotIntentCodeGraphQueryService'

  // Code
  async getDotIntentCodeProject(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getDotIntentCodeProject()`

    // Get the node
    var projectDotIntentCodeNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,  // parentId
            projectNode.instanceId,
            SourceNodeTypes.projectDotIntentCode,
            SourceNodeNames.projectDotIntentCode)

    // Return
    return projectDotIntentCodeNode
  }
}
