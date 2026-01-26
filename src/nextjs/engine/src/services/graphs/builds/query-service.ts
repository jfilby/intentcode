import { PrismaClient, SourceNode } from '@prisma/client'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class BuildsGraphQueryService {

  // Consts
  clName = 'BuildsGraphQueryService'

  // Code
  async getBuildsNode(
    prisma: PrismaClient,
    projectNode: SourceNode) {

    // Get the node
    var buildsNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,  // parentId
            projectNode.instanceId,
            SourceNodeTypes.builds,
            SourceNodeNames.builds)

    // Return
    return buildsNode
  }
}
