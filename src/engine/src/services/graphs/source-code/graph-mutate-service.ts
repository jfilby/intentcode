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
export class SourceCodeGraphMutateService {

  // Consts
  clName = 'SourceCodeGraphMutateService'

  // Code
  async getOrCreateSourceCodeProject(
          store: ProjectStore,
          buildNode: SourceNodeRecord,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodeProject()`

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
    let sourceCodeProject = await
          sourceNodeModel.getByUniqueKey(
            store,
            buildNode.id,  // parentId
            buildNode.projectId,
            SourceNodeTypes.projectSourceCode,
            SourceNodeNames.projectSourceCode)

    if (sourceCodeProject != null) {
      return sourceCodeProject
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
    sourceCodeProject = await
      sourceNodeModel.create(
        store,
        buildNode.id,  // parentId
        buildNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.projectSourceCode,
        SourceNodeNames.projectSourceCode,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

    // Return
    return sourceCodeProject
  }

  async getOrCreateSourceCodeDir(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodeDir()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectSourceCode,
          SourceNodeTypes.sourceCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    let sourceCodeDir = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            SourceNodeTypes.sourceCodeDir,
            name)

    if (sourceCodeDir != null) {
      return sourceCodeDir
    }

    // Create the node
    sourceCodeDir = await
      sourceNodeModel.create(
        store,
        parentNode.id,  // parentId
        projectId,
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

  async upsertSourceCodeFile(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          name: string,
          content: string | null,
          sourceNodeGenerationData: SourceNodeGenerationData) {

    // Debug
    const fnName = `${this.clName}.upsertSourceCodeFile()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectSourceCode,
          SourceNodeTypes.sourceCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Get contentHash
    let contentHash: string | null = null

    if (content != null) {
      contentHash = blake3(JSON.stringify(content)).toString()
    }

    // Upsert the node
    const sourceCodeFile = await
            sourceNodeModel.upsert(
              store,
              undefined,      // id
              parentNode.id,  // parentId
              projectId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.sourceCodeFile,
              name,
              content,
              contentHash,
              null,           // jsonContent
              null,           // jsonContentHash
              new Date())

    // Get promptHash
    const promptHash =
            blake3(JSON.stringify(sourceNodeGenerationData.prompt)).toString()

    // Upsert SourceNodeGeneration
    await
            sourceNodeGenerationModel.upsert(
              store,
              undefined,          // id
              sourceCodeFile.id,  // sourceNodeId
              sourceNodeGenerationData.modelId,
              sourceNodeGenerationData.temperature ?? null,
              sourceNodeGenerationData.prompt,
              promptHash,
              content,
              contentHash,
              null,               // jsonContent,
              null)               // jsonContentHash

    // Delete old SourceNodeGenerations
    await sourceNodeGenerationService.deleteOld(
            store,
            sourceCodeFile.id)  // sourceNodeId

    // Return
    return sourceCodeFile
  }
}
