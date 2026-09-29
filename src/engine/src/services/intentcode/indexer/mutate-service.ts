import { getModelId } from '@/services/intentcode/common/model-id.js'
import { IntentError } from '@/core/errors.js'
import { walkDir } from '@/core/walk-dir.js'
import fs from 'fs'
import { blake3 } from '@noble/hashes/blake3'
import { ProjectStore } from '@/core/store.js'
import { SourceNodeRecord } from '@/core/records.js'
import { IndexerLlmService } from './llm-service.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { IntentCodeAiTasks, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service.js'
import { FsUtilsService } from '@/services/utils/fs-utils-service.js'
import { IndexerPromptService } from './prompt-service.js'
import { IntentCodeFilenameService } from '../../utils/filename-service.js'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service.js'
import { IntentCodeMessagesService } from '../common/messages-service.js'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service.js'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const fsUtilsService = new FsUtilsService()
const indexerLlmService = new IndexerLlmService()
const indexerPromptService = new IndexerPromptService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()

// Class
export class IndexerMutateService {

  // Consts
  clName = 'IndexerMutateService'

  // Code
  async getExistingJsonContent(
          store: ProjectStore,
          intentFileNode: SourceNodeRecord,
          modelId: string,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Try to get existing indexer data SourceNode
    const indexerDataSourceNode = await
            sourceNodeModel.getByUniqueKey(
              store,
              intentFileNode.id,  // parentId
              intentFileNode.projectId,
              SourceNodeTypes.intentCodeIndexedData,
              SourceNodeNames.indexedData)

    if (indexerDataSourceNode == null) {
      return null
    }

    // Get promptHash
    const promptHash = blake3(JSON.stringify(prompt)).toString()

    // Try to get existing SourceNodeGeneration
    const sourceNodeGeneration = await
            sourceNodeGenerationModel.getByUniqueKey(
              store,
              indexerDataSourceNode.id,
              modelId,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return
    }

    // Return jsonContent
    return sourceNodeGeneration.jsonContent
  }

  async indexFileWithLlm(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord,
          projectIntentCodeNode: SourceNodeRecord,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

    // Verbose output
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.min) {

      console.log(``)
      console.log(`indexing: ${buildFromFile.relativePath}..`)
    }

    // The model id
    const modelId = await getModelId(IntentCodeAiTasks.indexer)

    // Get prompt
    const prompt = await
            indexerPromptService.getPrompt(
              store,
              projectNode,
              buildData.extensionsData,
              buildFromFile)

    // Already generated? The value is whatever the model replied with, so it
    // stays untyped until processQueryResults reads it.
    var jsonContent: unknown = await
          this.getExistingJsonContent(
            store,
            buildFromFile.fileNode,
            modelId,
            prompt)

    // Run
    if (jsonContent == null) {

      const llmResults = await
              indexerLlmService.llmRequest(
                store,
                                IntentCodeAiTasks.indexer,
                prompt)

      /* jsonContent = {
        astTree: llmResults.queryResultsJson.astTree
      } */

      jsonContent = llmResults.queryResultsJson
    }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      modelId: modelId,
      prompt: prompt
    }

    // Save the index data
    await this.processQueryResults(
            store,
            projectNode,
            buildFromFile,
            sourceNodeGenerationData,
            jsonContent)
  }

  async indexProject(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord,
          projectIntentCodeNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.indexProject()`

    // Get intentCodePath
    const jsonContent = projectIntentCodeNode.jsonContent
    const intentCodePath =
      jsonContent != null && typeof jsonContent === 'object' &&
      'path' in jsonContent && typeof jsonContent.path === 'string'
        ? jsonContent.path
        : undefined

    // Validate. Without the path there is no IntentCode tree to index.
    if (intentCodePath == null) {

      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: the IntentCode project node has no path`
      })
    }

    // Walk dir
    var intentCodeList: string[] = []

    await walkDir(
      intentCodePath,
      intentCodeList,
      {
        recursive: true
      })

    // Analyze each file
    var buildFromFiles: BuildFromFile[] = []

    for (const intentCodeFilename of intentCodeList) {

      // Get last save time of the file
      const fileModifiedTime = await
        fsUtilsService.getLastUpdateTime(intentCodeFilename)

      // Get targetFileExt
      const targetFileExt =
        intentCodeFilenameService.getTargetFileExt(intentCodeFilename)

      if (targetFileExt == null) {
        console.warn(`${fnName}: skipping file: ${intentCodeFilename}`)
        continue
      }

      // Read file
      const intentCode = await
        fs.readFileSync(
          intentCodeFilename,
          { encoding: 'utf8', flag: 'r' })

      // Get/create the file's SourceNode
      const intentFileNode = await
        intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
          store,
          projectIntentCodeNode,
          intentCodeFilename)

      // Check if the file has been updated since last indexed
      if (intentFileNode?.contentUpdated != null &&
          new Date(intentFileNode.contentUpdated) <= fileModifiedTime) {

        // console.log(`${fnName}: file: ${intentCodeFilename} already indexed`)
        continue
      }

      // Get relativePath
      const relativePath = intentCodeFilename.substring(intentCodePath.length + 1)

      // Add to indexerFiles
      buildFromFiles.push({
        filename: intentCodeFilename,
        relativePath: relativePath,
        fileModifiedTime: fileModifiedTime,
        content: intentCode,
        targetFileExt: targetFileExt,
        fileNode: intentFileNode
      })
    }

    // Index files
    for (const buildFromFile of buildFromFiles) {

      await this.indexFileWithLlm(
        store,
        buildData,
        projectNode,
        projectIntentCodeNode,
        buildFromFile)
    }
  }

  async processQueryResults(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          buildFromFile: BuildFromFile,
          sourceNodeGenerationData: SourceNodeGenerationData,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (buildFromFile.fileNode.jsonContent == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: intentFileNode.jsonContent == null`
      })
    }

    const fileJsonContent = buildFromFile.fileNode.jsonContent
    if (fileJsonContent != null &&
        typeof fileJsonContent === 'object' &&
        'relativePath' in fileJsonContent &&
        fileJsonContent.relativePath == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: intentFileNode.jsonContent.relativePath == null`
      })
    }

    // Set the relative path of the file indexed
    jsonContent.relativePath =
      fileJsonContent != null && typeof fileJsonContent === 'object' &&
      'relativePath' in fileJsonContent
        ? fileJsonContent.relativePath
        : undefined

    // Update the IntentCode node with deps
    if (jsonContent.source?.deps != null) {

      await dependenciesMutateService.processDeps(
              store,
              projectNode,
              buildFromFile.fileNode,
              jsonContent.source.deps)
    }

    // Upsert the indexed data node
    const indexerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeIndexedData(
              store,
              buildFromFile.fileNode.projectId,
              buildFromFile.fileNode,  // parentNode
              SourceNodeNames.indexedData,
              jsonContent,
              sourceNodeGenerationData,
              buildFromFile.fileModifiedTime)

    // Debug
    // console.log(`${fnName}: index node set: ${indexerDataSourceNode.id}`)

    // Print warnings and errors (must be at the end of results processing)
    intentCodeMessagesService.handleMessages(jsonContent)
  }
}
