import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class BuildsGraphMutateService {

  // Consts
  clName = 'BuildsGraphMutateService'

  // Code
  async getOrCreateBuildsNode(
    prisma: PrismaClient,
    projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getOrCreateBuildsNode()`

    // Validate
    if (projectNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (projectNode.type !== SourceNodeTypes.project) {
      throw new CustomError(`${fnName}: invalid type: ${projectNode.type}`)
    }

    // Try to get the builds node
    var buildsNode = await
      sourceNodeModel.getByUniqueKey(
        prisma,
        projectNode.id,
        projectNode.instanceId,
        SourceNodeTypes.builds,
        SourceNodeNames.builds)

    if (buildsNode != null) {
      return buildsNode
    }

    // Create a builds node
    buildsNode = await
      sourceNodeModel.create(
        prisma,
        projectNode.id,
        projectNode.instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.builds,
        SourceNodeNames.builds,
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return buildsNode
  }

  async createBuildNode(
    prisma: PrismaClient,
    buildsNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getOrCreateBuildsNode()`

    // Validate
    if (buildsNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (buildsNode.type !== SourceNodeTypes.builds) {
      throw new CustomError(`${fnName}: invalid type: ${buildsNode.type}`)
    }

    // Create a build node
    const buildNode = await
      sourceNodeModel.create(
        prisma,
        buildsNode.id,
        buildsNode.instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.build,
        new Date().toISOString(),  // name
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return buildNode
  }
}
