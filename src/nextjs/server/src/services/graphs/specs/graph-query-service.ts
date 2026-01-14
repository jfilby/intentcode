import { PrismaClient, SourceNode } from '@prisma/client'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class SpecsGraphQueryService {

  // Consts
  clName = 'SpecsGraphQueryService'

  // Code
  async getSpecsProject(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getSpecsProject()`

    // Get the node
    var specsProject = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,  // parentId
            projectNode.instanceId,
            SourceNodeTypes.projectSpecs,
            SourceNodeNames.projectSpecs)

    // Return
    return specsProject
  }
}
