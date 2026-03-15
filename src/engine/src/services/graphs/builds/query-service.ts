import { PrismaClient, SourceNode } from '@/prisma/client.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

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
