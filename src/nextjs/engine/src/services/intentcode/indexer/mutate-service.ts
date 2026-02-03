const fs = require('fs')
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { IndexerLlmService } from './llm-service'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { AiTasksService } from '@/serene-ai-server/services/ai-tasks/ai-tasks-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeAiTasks, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types'
import { SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IndexerPromptService } from './prompt-service'
import { IntentCodeFilenameService } from '../../utils/filename-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodeMessagesService } from '../common/messages-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const aiTasksService = new AiTasksService()
const dependenciesMutateService = new DependenciesMutateService()
const fsUtilsService = new FsUtilsService()
const indexerLlmService = new IndexerLlmService()
const indexerPromptService = new IndexerPromptService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const walkDirService = new WalkDirService()
const usersService = new UsersService()

// Class
export class IndexerMutateService {

  // Consts
  clName = 'IndexerMutateService'

  // Code
  async getExistingJsonContent(
          prisma: PrismaClient,
          intentFileNode: SourceNode,
          tech: Tech,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Try to get existing indexer data SourceNode
    const indexerDataSourceNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              intentFileNode.id,  // parentId
              intentFileNode.instanceId,
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
              prisma,
              indexerDataSourceNode.id,
              tech.id,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return
    }

    // Return jsonContent
    return sourceNodeGeneration.jsonContent
  }

  async indexFileWithLlm(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode,
          projectIntentCodeNode: SourceNode,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

    // Verbose output
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.min) {

      console.log(`indexing: ${buildFromFile.filename}..`)
    }

    // Get the admin UserProfile
    const adminUserProfile = await
            usersService.getUserProfileByEmail(
              prisma,
              ServerTestTypes.adminUserEmail)

    if (adminUserProfile == null) {
      throw new CustomError(`${fnName}: adminUserProfile == null`)
    }

    // Get tech
    const tech = await
      aiTasksService.getTech(
        prisma,
        ServerOnlyTypes.namespace,
        IntentCodeAiTasks.indexer,
        null,  // userProfileId
        true)  // exceptionOnNotFound

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null`)
    }

    // Get prompt
    const prompt = await
            indexerPromptService.getPrompt(
              prisma,
              projectNode,
              buildData.extensionsData,
              buildFromFile)

    // Already generated?
    var jsonContent = await
          this.getExistingJsonContent(
            prisma,
            buildFromFile.fileNode,
            tech,
            prompt)

    // Run
    if (jsonContent == null) {

      const llmResults = await
              indexerLlmService.llmRequest(
                prisma,
                adminUserProfile.id,
                tech,
                prompt)

      /* jsonContent = {
        astTree: llmResults.queryResultsJson.astTree
      } */

      jsonContent = llmResults.queryResultsJson
    }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      techId: tech.id,
      prompt: prompt
    }

    // Save the index data
    await this.processQueryResults(
            prisma,
            projectNode,
            buildFromFile,
            sourceNodeGenerationData,
            jsonContent)
  }

  async indexProject(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode,
          projectIntentCodeNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.indexProject()`

    // Walk dir
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            (projectIntentCodeNode.jsonContent as any).path,
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
          prisma,
          projectIntentCodeNode,
          intentCodeFilename)

      // Check if the file has been updated since last indexed
      if (intentFileNode?.contentUpdated != null &&
          intentFileNode.contentUpdated <= fileModifiedTime) {

        // console.log(`${fnName}: file: ${intentCodeFilename} already indexed`)
        continue
      }

      // Add to indexerFiles
      buildFromFiles.push({
        filename: intentCodeFilename,
        fileModifiedTime: fileModifiedTime,
        content: intentCode,
        targetFileExt: targetFileExt,
        fileNode: intentFileNode
      })
    }

    // Index files
    for (const buildFromFile of buildFromFiles) {

      await this.indexFileWithLlm(
              prisma,
              buildData,
              projectNode,
              projectIntentCodeNode,
              buildFromFile)
    }
  }

  async processQueryResults(
          prisma: PrismaClient,
          projectNode: SourceNode,
          buildFromFile: BuildFromFile,
          sourceNodeGenerationData: SourceNodeGenerationData,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (buildFromFile.fileNode.jsonContent == null) {
      throw new CustomError(
        `${fnName}: intentFileNode.jsonContent == null`)
    }

    if ((buildFromFile.fileNode.jsonContent as any).relativePath == null) {
      throw new CustomError(
        `${fnName}: intentFileNode.jsonContent.relativePath == null`)
    }

    // Set the relative path of the file indexed
    jsonContent.relativePath =
      (buildFromFile.fileNode.jsonContent as any).relativePath

    // Update the IntentCode node with deps
    if (jsonContent.source?.deps != null) {

      await dependenciesMutateService.processDeps(
              prisma,
              projectNode,
              buildFromFile.fileNode,
              jsonContent.source.deps)
    }

    // Upsert the indexed data node
    const indexerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeIndexedData(
              prisma,
              buildFromFile.fileNode.instanceId,
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
