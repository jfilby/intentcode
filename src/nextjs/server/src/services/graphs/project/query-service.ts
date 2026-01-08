import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class ProjectGraphQueryService {

  // Consts
  clName = 'ProjectGraphQueryService'

  // Code
  async getIntentCodeProjectNode(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getIntentCodeProjectNode()`

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
              SourceNodeTypes.intentCodeProject,
              SourceNodeNames.intentCodeProject)

    // Return
    return sourceCodeProject
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
              SourceNodeTypes.sourceCodeProject,
              SourceNodeNames.sourceCodeProject)

    // Return
    return sourceCodeProject
  }
}
