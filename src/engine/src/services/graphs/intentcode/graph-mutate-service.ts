import { IntentError } from '@/core/errors.js'
import { blake3 } from '@noble/hashes/blake3'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { SourceNodeGenerationService } from '../general/source-node-generation-service.js'

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
  async deleteIntentCodeFile(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          filename: string) {

    // Debug
    const fnName = `${this.clName}.deleteIntentCodeFile()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectIntentCode,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    var intentCodeFile = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            SourceNodeTypes.intentCodeFile,
            filename)

    // Delete the node if found
    if (intentCodeFile != null) {

      await sourceNodeModel.deleteById(
        store,
        intentCodeFile.id)
    }
  }

  async getOrCreateIntentCodeDir(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeDir()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectIntentCode,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    var intentCodeDir = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            SourceNodeTypes.intentCodeDir,
            name)

    if (intentCodeDir != null) {
      return intentCodeDir
    }

    // Create the node
    intentCodeDir = await
      sourceNodeModel.create(
        store,
        parentNode.id,  // parentId
        projectId,
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

  async upsertIntentCodeFile(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          name: string,
          relativePath: string,
          content?: string) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodeFile()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectIntentCode,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    var intentCodeFile = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            SourceNodeTypes.intentCodeFile,
            name)

    // console.log(`${fnName}: intentCodeFile: ` + JSON.stringify(intentCodeFile))

    // Get contentHash
    var contentHash: string | null = null

    if (content != null) {
      contentHash = blake3(JSON.stringify(content)).toString()
    }

    // Create the node
    intentCodeFile = await
      sourceNodeModel.upsert(
        store,
        undefined,      // id
        parentNode.id,  // parentId
        projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.intentCodeFile,
        name,
        content ?? null,
        contentHash,
        {
          relativePath: relativePath
        },              // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return intentCodeFile
  }

  async getOrCreateIntentCodeProjectNode(
          store: ProjectStore,
          buildNode: SourceNodeRecord,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeProjectNode()`

    // Validate
    if (buildNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: buildNode == null`
      })
    }

    if (buildNode.type !== SourceNodeTypes.build) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${buildNode.type}`
      })
    }

    // Try to get the node
    var intentCodeProject = await
          sourceNodeModel.getByUniqueKey(
            store,
            buildNode.id,  // parentId
            buildNode.projectId,
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
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    intentCodeProject = await
      sourceNodeModel.create(
        store,
        buildNode.id,  // parentId
        buildNode.projectId,
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

  async upsertTechStackJson(
          store: ProjectStore,
          projectId: string | undefined,
          parentNode: SourceNodeRecord | undefined,
          jsonContent: any,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.upsertTechStackJson()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (parentNode.type !== SourceNodeTypes.projectIntentCode) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode.type !== SourceNodeTypes.projectSpecs`
      })
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
              store,
              undefined,         // id
              parentNode.id,     // parentId
              projectId,
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
              store,
              undefined,                  // id
              techStackJsonSourceNode.id,  // sourceNodeId
              sourceNodeGenerationData.modelId,
              sourceNodeGenerationData.temperature ?? null,
              sourceNodeGenerationData.prompt,
              promptHash,
              null,  // content
              null,  // contentHash
              jsonContent,
              jsonContentHash)

    // Delete old SourceNodeGenerations
    await sourceNodeGenerationService.deleteOld(
            store,
            techStackJsonSourceNode.id)  // sourceNodeId

    // Return
    return techStackJsonSourceNode
  }

  async upsertIntentCodeCompilerData(
          store: ProjectStore,
          projectId: string | undefined,
          parentNode: SourceNodeRecord | undefined,
          name: string,
          jsonContent: any,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodeCompilerData()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (parentNode.type !== SourceNodeTypes.intentCodeFile) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode.type !== ` +
                 `SourceNodeTypes.intentCodeFile`
      })
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    const intentCodeCompilerData = await
            sourceNodeModel.upsert(
              store,
              undefined,         // id
              parentNode.id,     // parentId
              projectId,
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
              store,
              undefined,                  // id
              intentCodeCompilerData.id,  // sourceNodeId
              sourceNodeGenerationData.modelId,
              sourceNodeGenerationData.temperature ?? null,
              sourceNodeGenerationData.prompt,
              promptHash,
              null,  // content
              null,  // contentHash
              jsonContent,
              jsonContentHash)

    // Delete old SourceNodeGenerations
    await sourceNodeGenerationService.deleteOld(
            store,
            intentCodeCompilerData.id)  // sourceNodeId

    // Return
    return intentCodeCompilerData
  }

  async upsertIntentCodeIndexedData(
          store: ProjectStore,
          projectId: string | undefined,
          parentNode: SourceNodeRecord | undefined,
          name: string,
          jsonContent: any,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodeIndexedData()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (parentNode.type !== SourceNodeTypes.intentCodeFile) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode.type !== SourceNodeTypes.intentCodeFile`
      })
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    const intentCodeIndexedData = await
            sourceNodeModel.upsert(
              store,
              undefined,         // id
              parentNode.id,     // parentId
              projectId,
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
              store,
              undefined,                  // id
              intentCodeIndexedData.id,  // sourceNodeId
              sourceNodeGenerationData.modelId,
              sourceNodeGenerationData.temperature ?? null,
              sourceNodeGenerationData.prompt,
              promptHash,
              null,  // content
              null,  // contentHash
              jsonContent,
              jsonContentHash)

    // Delete old SourceNodeGenerations
    await sourceNodeGenerationService.deleteOld(
            store,
            intentCodeIndexedData.id)  // sourceNodeId

    // Return
    return intentCodeIndexedData
  }
}
