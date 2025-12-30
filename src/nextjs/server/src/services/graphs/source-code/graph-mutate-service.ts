import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
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
            instanceId,
            SourceNodeTypes.sourceCodeProject,
            name)

    if (sourceCodeProject != null) {
      return sourceCodeProject
    }

    // Define jsonContent
    const jsonContent = {
      path: localPath
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    sourceCodeProject = await
      sourceNodeModel.create(
        prisma,
        null,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.sourceCodeProject,
        name,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

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
            parentNode.id,
            instanceId,
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
        BaseDataTypes.activeStatus,
        SourceNodeTypes.sourceCodeDir,
        name,
        null,           // content
        null,           // contentHash
        null,           // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return sourceCodeDir
  }

  async getOrCreateSourceCodeFile(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string,
          content: string | null) {

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
            parentNode.id,
            instanceId,
            SourceNodeTypes.sourceCodeFile,
            name)

    if (sourceCodeFile != null) {
      return sourceCodeFile
    }

    // Get jsonContentHash
    var contentHash: string | null = null

    if (content != null) {

      // Blake3 hash
      contentHash = blake3(JSON.stringify(content)).toString()
    }

    // Create the node
    sourceCodeFile = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.sourceCodeFile,
        name,
        content,
        contentHash,
        null,           // jsonContent
        null,           // jsonContentHash
        new Date())

    // Return
    return sourceCodeFile
  }
}
