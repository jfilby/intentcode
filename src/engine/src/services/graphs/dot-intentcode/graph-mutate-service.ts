import { IntentError } from '@/core/errors.js'
import { blake3 } from '@noble/hashes/blake3'
import type { NodeContent, SourceNodeRecord } from '@/core/records.js'
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
export class DotIntentCodeGraphMutateService {

  // Consts
  clName = 'DotIntentCodeGraphMutateService'

  // Code
  async getOrCreateDotIntentCodeDir(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateDotIntentCodeDir()`

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
    let dotIntentCodeDir = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            SourceNodeTypes.dotIntentCodeDir,
            name)

    if (dotIntentCodeDir != null) {
      return dotIntentCodeDir
    }

    // Create the node
    dotIntentCodeDir = await
      sourceNodeModel.create(
        store,
        parentNode.id,  // parentId
        projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.dotIntentCodeDir,
        name,
        null,           // content
        null,           // contentHash
        null,           // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return dotIntentCodeDir
  }

  async getOrCreateConfigFile(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          sourceNodeType: SourceNodeTypes,
          name: string,
          relativePath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateConfigFile()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectDotIntentCode,
          SourceNodeTypes.dotIntentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid parent type: ${parentNode.type}`
      })
    }

    if (![SourceNodeTypes.techStackJsonFile].includes(sourceNodeType)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    let intentCodeFile = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            sourceNodeType,
            name)

    // console.log(`${fnName}: intentCodeFile: ` + JSON.stringify(intentCodeFile))

    if (intentCodeFile != null) {
      return intentCodeFile
    }

    // Create the node
    intentCodeFile = await
      sourceNodeModel.create(
        store,
        parentNode.id,  // parentId
        projectId,
        BaseDataTypes.activeStatus,
        sourceNodeType,
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

  async getOrCreateDotIntentCodeProject(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          localPath: string) {

    // Try to get the node
    let projectDotIntentCodeNode = await
      sourceNodeModel.getByUniqueKey(
        store,
        projectNode.id,  // parentId
        projectNode.projectId,
        SourceNodeTypes.projectDotIntentCode,
        SourceNodeNames.projectDotIntentCode)

    if (projectDotIntentCodeNode != null) {
      return projectDotIntentCodeNode
    }

    // Define jsonContent
    const jsonContent = {
      path: localPath
    }

    // Get jsonContentHash
    let jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    projectDotIntentCodeNode = await
      sourceNodeModel.create(
        store,
        projectNode.id,  // parentId
        projectNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.projectDotIntentCode,
        SourceNodeNames.projectDotIntentCode,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

    // Return
    return projectDotIntentCodeNode
  }

  async upsertConfigData(
          store: ProjectStore,
          projectId: string | undefined,
          parentNode: SourceNodeRecord | undefined,
          name: string,
          content: string,
          jsonContent: NodeContent,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.upsertConfigData()`

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

    // Get contentHash
    let contentHash: string | null = null

    if (content != null) {
      contentHash = blake3(JSON.stringify(content)).toString()
    }

    // Get jsonContentHash
    let jsonContentHash: string | null = null

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
              content,
              contentHash,
              jsonContent,
              jsonContentHash,
              fileModifiedTime)  // contentUpdated

    // Get promptHash
    const promptHash =
            blake3(JSON.stringify(sourceNodeGenerationData.prompt)).toString()

    // Upsert SourceNodeGeneration
    await
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
          jsonContent: NodeContent,
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
        message: `${fnName}: parentNode.type !== ` +
                 `SourceNodeTypes.intentCodeFile`
      })
    }

    // Get jsonContentHash
    let jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
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
    await
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
