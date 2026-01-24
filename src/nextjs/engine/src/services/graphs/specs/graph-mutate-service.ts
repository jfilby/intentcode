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

// Class
export class SpecsGraphMutateService {

  // Consts
  clName = 'SpecsGraphMutateService'

  // Code
  async getOrCreateSpecsDir(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsDir()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.projectSpecs,
          SourceNodeTypes.specsDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: invalid type: ${parentNode.type}`)
    }

    // Try to get the node
    var specsDir = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.specsDir,
            name)

    if (specsDir != null) {
      return specsDir
    }

    // Create the node
    specsDir = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.specsDir,
        name,
        null,           // content
        null,           // contentHash
        null,           // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return specsDir
  }

  async getOrCreateSpecsFile(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string,
          relativePath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsFile()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.projectSpecs,
          SourceNodeTypes.specsDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: invalid type: ${parentNode.type}`)
    }

    // Try to get the node
    var specsFile = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.specsFile,
            name)

    // console.log(`${fnName}: intentCodeFile: ` + JSON.stringify(intentCodeFile))

    if (specsFile != null) {
      return specsFile
    }

    // Create the node
    specsFile = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.specsFile,
        name,
        null,           // content
        null,           // contentHash
        {
          relativePath: relativePath
        },              // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return specsFile
  }

  async getOrCreateSpecsProject(
          prisma: PrismaClient,
          projectNode: SourceNode,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsProject()`

    // Try to get the node
    var specsProjectNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,  // parentId
            projectNode.instanceId,
            SourceNodeTypes.projectSpecs,
            SourceNodeNames.projectSpecs)

    if (specsProjectNode != null) {
      return specsProjectNode
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
    specsProjectNode = await
      sourceNodeModel.create(
        prisma,
        projectNode.id,  // parentId
        projectNode.instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.projectSpecs,
        SourceNodeNames.projectSpecs,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

    // Return
    return specsProjectNode
  }

  async upsertTechStackJson(
          prisma: PrismaClient,
          instanceId: string | undefined,
          parentNode: SourceNode | undefined,
          jsonContent: any,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.upsertTechStackJson()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (parentNode.type !== SourceNodeTypes.projectSpecs) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.projectSpecs`)
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    const techStackJsonSourceNode = await
            sourceNodeModel.upsert(
              prisma,
              undefined,         // id
              parentNode.id,     // parentId
              instanceId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.techStackJsonFile,
              SourceNodeNames.techStackJsonFile,
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
              techStackJsonSourceNode.id,  // sourceNodeId
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
            techStackJsonSourceNode.id)  // sourceNodeId

    // Return
    return techStackJsonSourceNode
  }
}
