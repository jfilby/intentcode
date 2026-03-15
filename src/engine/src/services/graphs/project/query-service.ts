import { CustomError } from 'serene-core-server'
import { PrismaClient, SourceNode } from '@/prisma/client.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class ProjectGraphQueryService {

  // Consts
  clName = 'ProjectGraphQueryService'

  // Code
  async getProjectNode(
          prisma: PrismaClient,
          instanceId: string) {

    // Debug
    const fnName = `${this.clName}.getProjectNode()`

    // Try to get the node
    const projectNodes = await
            sourceNodeModel.filter(
              prisma,
              null,  // parentId
              instanceId,
              SourceNodeTypes.project)

    // Validate
    if (projectNodes.length === 0) {
      return undefined

    } else if (projectNodes.length > 1) {
      throw new CustomError(`${fnName}: projectNodes.length > 1`)
    }

    // Return
    return projectNodes[0]
  }

  async getSourceProjectNode(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getSourceProjectNode()`

    // Validate
    if (projectNode.type !== SourceNodeTypes.project) {

      throw new CustomError(
        `${fnName}: projectNode.type !== SourceNodeTypes.project`)
    }

    // Get source node
    const sourceCodeProject = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              projectNode.id,
              projectNode.instanceId,
              SourceNodeTypes.projectSourceCode,
              SourceNodeNames.projectSourceCode)

    // Return
    return sourceCodeProject
  }
}
