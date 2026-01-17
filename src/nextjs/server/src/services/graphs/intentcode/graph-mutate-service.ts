import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { SourceNodeGenerationService } from '../general/source-node-generation-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const sourceNodeGenerationService = new SourceNodeGenerationService()

// Code
export class IntentCodeGraphMutateService {

  // Consts
  clName = 'IntentCodeGraphMutateService'

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
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.projectIntentCode,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: invalid type: ${parentNode.type}`)
    }

    // Try to get the node
    var intentCodeDir = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
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
        BaseDataTypes.activeStatus,
        SourceNodeTypes.intentCodeDir,
        name,
        null,           // content
        null,           // contentHash
        null,           // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return intentCodeDir
  }

  async getOrCreateIntentCodeFile(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string,
          relativePath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeFile()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.projectIntentCode,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: invalid type: ${parentNode.type}`)
    }

    // Try to get the node
    var intentCodeFile = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.intentCodeFile,
            name)

    // console.log(`${fnName}: intentCodeFile: ` + JSON.stringify(intentCodeFile))

    if (intentCodeFile != null) {
      return intentCodeFile
    }

    // Create the node
    intentCodeFile = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.intentCodeFile,
        name,
        null,           // content
        null,           // contentHash
        {
          relativePath: relativePath
        },              // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return intentCodeFile
  }

  async getOrCreateIntentCodeProject(
          prisma: PrismaClient,
          projectNode: SourceNode,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeProject()`

    // Try to get the node
    var intentCodeProject = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,  // parentId
            projectNode.instanceId,
            SourceNodeTypes.projectIntentCode,
            SourceNodeNames.projectIntentCode)

    if (intentCodeProject != null) {
      return intentCodeProject
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
    intentCodeProject = await
      sourceNodeModel.create(
        prisma,
        projectNode.id,  // parentId
        projectNode.instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.projectIntentCode,
        SourceNodeNames.projectIntentCode,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

    // Return
    return intentCodeProject
  }

  async upsertIntentCodeCompilerData(
          prisma: PrismaClient,
          instanceId: string | undefined,
          parentNode: SourceNode | undefined,
          name: string,
          jsonContent: any,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodeCompilerData()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (parentNode.type !== SourceNodeTypes.intentCodeFile) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeFile`)
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    const intentCodeCompilerData = await
            sourceNodeModel.upsert(
              prisma,
              undefined,         // id
              parentNode.id,     // parentId
              instanceId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.intentCodeCompilerData,
              name,
              null,              // content
              null,              // contentHash
              jsonContent,
              jsonContentHash,
              fileModifiedTime)  // contentUpdated

    // Get promptHash
    const promptHash =
            blake3(JSON.stringify(sourceNodeGenerationData.prompt)).toString()

    // Upsert SourceNodeGeneration
    const sourceNodeGeneration = await
            sourceNodeGenerationModel.upsert(
              prisma,
              undefined,                  // id
              intentCodeCompilerData.id,  // sourceNodeId
              sourceNodeGenerationData.techId,
              sourceNodeGenerationData.temperature ?? null,
              sourceNodeGenerationData.prompt,
              promptHash,
              null,  // content
              null,  // contentHash
              jsonContent,
              jsonContentHash)

    // Delete old SourceNodeGenerations
    await sourceNodeGenerationService.deleteOld(
            prisma,
            intentCodeCompilerData.id)  // sourceNodeId

    // Return
    return intentCodeCompilerData
  }

  async upsertIntentCodeIndexedData(
          prisma: PrismaClient,
          instanceId: string | undefined,
          parentNode: SourceNode | undefined,
          name: string,
          jsonContent: any,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodeIndexedData()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (parentNode.type !== SourceNodeTypes.intentCodeFile) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeFile`)
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    const intentCodeIndexedData = await
            sourceNodeModel.upsert(
              prisma,
              undefined,         // id
              parentNode.id,     // parentId
              instanceId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.intentCodeIndexedData,
              name,
              null,              // content
              null,              // contentHash
              jsonContent,
              jsonContentHash,
              fileModifiedTime)  // contentUpdated

    // Get promptHash
    const promptHash =
            blake3(JSON.stringify(sourceNodeGenerationData.prompt)).toString()

    // Upsert SourceNodeGeneration
    const sourceNodeGeneration = await
            sourceNodeGenerationModel.upsert(
              prisma,
              undefined,                  // id
              intentCodeIndexedData.id,  // sourceNodeId
              sourceNodeGenerationData.techId,
              sourceNodeGenerationData.temperature ?? null,
              sourceNodeGenerationData.prompt,
              promptHash,
              null,  // content
              null,  // contentHash
              jsonContent,
              jsonContentHash)

    // Delete old SourceNodeGenerations
    await sourceNodeGenerationService.deleteOld(
            prisma,
            intentCodeIndexedData.id)  // sourceNodeId

    // Return
    return intentCodeIndexedData
  }
}
