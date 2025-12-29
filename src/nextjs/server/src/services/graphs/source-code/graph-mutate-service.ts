import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Code
export class SourceCodeGraphMutateService {

  // Consts
  clName = 'SourceCodeGraphMutateService'

  // Code
  async getOrCreateSourceCodeProject(
          prisma: PrismaClient,
          instanceId: string,
          name: string,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodeProject()`

    // Try to get the node
    var sourceCodeProject = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            SourceNodeTypes.sourceCodeProject,
            name)

    if (sourceCodeProject != null) {
      return sourceCodeProject
    }

    // Create the node
    sourceCodeProject = await
      sourceNodeModel.create(
        prisma,
        null,  // parentId
        instanceId,
        SourceNodeTypes.sourceCodeProject,
        localPath,
        name,
        null,  // content
        null,  // contentHash
        null,  // metadata
        null,  // analysisStatus
        null)  // lastAnalyzed

    // Return
    return sourceCodeProject
  }

  async getOrCreateSourceCodeDir(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodeDir()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    if (![SourceNodeTypes.sourceCodeProject,
          SourceNodeTypes.sourceCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.sourceCodeProject`)
    }

    // Try to get the node
    var sourceCodeDir = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            SourceNodeTypes.sourceCodeDir,
            name)

    if (sourceCodeDir != null) {
      return sourceCodeDir
    }

    // Create the node
    sourceCodeDir = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        SourceNodeTypes.sourceCodeDir,
        null,           // path
        name,
        null,           // content
        null,           // contentHash
        null,           // metadata
        null,           // analysisStatus
        null)           // lastAnalyzed

    // Return
    return sourceCodeDir
  }

  async getOrCreateSourceCodeFile(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodeFile()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    if (![SourceNodeTypes.sourceCodeProject,
          SourceNodeTypes.sourceCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.sourceCodeProject`)
    }

    // Try to get the node
    var sourceCodeFile = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            SourceNodeTypes.sourceCodeFile,
            name)

    if (sourceCodeFile != null) {
      return sourceCodeFile
    }

    // Create the node
    sourceCodeFile = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        SourceNodeTypes.sourceCodeFile,
        null,           // path
        name,
        null,           // content
        null,           // contentHash
        null,           // metadata
        null,           // analysisStatus
        null)           // lastAnalyzed

    // Return
    return sourceCodeFile
  }
}
