import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Code
export class GraphMutateService {

  // Consts
  clName = 'GraphMutateService'

  // Code
  async getOrCreateIntentCodeDir(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeDir()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    if (![SourceNodeTypes.intentCodeProject,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeProject`)
    }

    // Try to get the node
    var intentCodeDir = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            SourceNodeTypes.intentCodeDir,
            name)

    if (intentCodeDir != null) {
      return intentCodeDir
    }

    // Create the node
    intentCodeDir = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        SourceNodeTypes.intentCodeDir,
        null,           // path
        name,
        null,           // content
        null,           // contentHash
        null,           // metadata
        null,           // analysisStatus
        null)           // lastAnalyzed

    // Return
    return intentCodeDir
  }

  async getOrCreateIntentCodeFile(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeFile()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    if (![SourceNodeTypes.intentCodeProject,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeProject`)
    }

    // Try to get the node
    var intentCodeFile = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            SourceNodeTypes.intentCodeFile,
            name)

    if (intentCodeFile != null) {
      return intentCodeFile
    }

    // Create the node
    intentCodeFile = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        SourceNodeTypes.intentCodeFile,
        null,           // path
        name,
        null,           // content
        null,           // contentHash
        null,           // metadata
        null,           // analysisStatus
        null)           // lastAnalyzed

    // Return
    return intentCodeFile
  }

  async getOrCreateIntentCodeProject(
          prisma: PrismaClient,
          instanceId: string,
          name: string,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeProject()`

    // Try to get the node
    var intentCodeProject = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            SourceNodeTypes.intentCodeProject,
            name)

    if (intentCodeProject != null) {
      return intentCodeProject
    }

    // Create the node
    intentCodeProject = await
      sourceNodeModel.create(
        prisma,
        null,  // parentId
        instanceId,
        SourceNodeTypes.intentCodeProject,
        localPath,
        name,
        null,  // content
        null,  // contentHash
        null,  // metadata
        null,  // analysisStatus
        null)  // lastAnalyzed

    // Return
    return intentCodeProject
  }
}
