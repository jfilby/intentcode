import { PrismaClient, SourceNode } from '@/prisma/client.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class SpecsGraphQueryService {

  // Consts
  clName = 'SpecsGraphQueryService'

  // Code
  async getSpecsProjectNode(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getSpecsProjectNode()`

    // Get the node
    var specsProjectNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,  // parentId
            projectNode.instanceId,
            SourceNodeTypes.projectSpecs,
            SourceNodeNames.projectSpecs)

    // Return
    return specsProjectNode
  }
}
