const fs = require('fs')
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { IndexerMutateLlmService } from './llm-service'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BuildData } from '@/types/build-types'
import { LlmEnvNames, ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionsData, SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { CompilerQueryService } from '../compiler/code/query-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeFilenameService } from '../../utils/filename-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const compilerQueryService = new CompilerQueryService()
const fsUtilsService = new FsUtilsService()
const indexerMutateLlmService = new IndexerMutateLlmService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const techQueryService = new TechQueryService()
const walkDirService = new WalkDirService()
const usersService = new UsersService()

// Class
export class IndexerMutateService {

  // Consts
  clName = 'IndexerMutateService'

  // Code
  async getExistingJsonContent(
          prisma: PrismaClient,
          intentFileSourceNode: SourceNode,
          tech: Tech,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Try to get existing indexer data SourceNode
    const indexerDataSourceNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              intentFileSourceNode.id,  // parentId
              intentFileSourceNode.instanceId,
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
          intentCodeProjectNode: SourceNode,
          fullPath: string,
          fileModifiedTime: Date,
          targetFileExt: string,
          intentCode: string) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

    // Verbose output
    if (ServerOnlyTypes.verbosity === true) {
      console.log(`indexing: ${fullPath}..`)
    }

    // Get/create the file's SourceNode
    const intentFileSourceNode = await
            intentCodePathGraphMutateService.getOrCreateIntentCodePathAsGraph(
              prisma,
              intentCodeProjectNode,
              fullPath)

    // Check if the file has been updated since last indexed
    if (intentFileSourceNode?.contentUpdated != null &&
        intentFileSourceNode.contentUpdated <= fileModifiedTime) {

      // console.log(`${fnName}: file: ${fullPath} already indexed`)
      return
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
            techQueryService.getTechByEnvKey(
              prisma,
              LlmEnvNames.indexerEnvName)

    // Get prompt
    const prompt =
      this.getPrompt(
        buildData.extensionsData,
        targetFileExt,
        intentCode)

    // Already generated?
    var jsonContent = await
          this.getExistingJsonContent(
            prisma,
            intentFileSourceNode,
            tech,
            prompt)

    // Run
    if (jsonContent == null) {

      const llmResults = await
              indexerMutateLlmService.llmRequest(
                prisma,
                adminUserProfile.id,
                tech,
                prompt)

      jsonContent = {
        astTree: llmResults.queryResults.json.astTree
      }
    }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      techId: tech.id,
      prompt: prompt
    }

    // Save the index data
    await this.processQueryResults(
            prisma,
            intentFileSourceNode,
            sourceNodeGenerationData,
            fileModifiedTime,
            jsonContent)

    // Return
    return
  }

  async indexProject(
          prisma: PrismaClient,
          buildData: BuildData,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.indexProject()`

    // Walk dir
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            (intentCodeProjectNode.jsonContent as any).path,
            intentCodeList)

    // Analyze each file
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

      // Index file
      await this.indexFileWithLlm(
              prisma,
              buildData,
              intentCodeProjectNode,
              intentCodeFilename,
              fileModifiedTime,
              intentCode,
              targetFileExt)
    }
  }

  getPrompt(
    extensionsData: ExtensionsData,
    targetFileExt: string,
    intentCode: string) {

    // Get rules by targetLang
    const targetLangPrompting =
            compilerQueryService.getSkillPrompting(
              extensionsData,
              targetFileExt)

    // Start the prompt
    var prompt = 
          `## Instructions\n` +  // TypeScript dialect
          `\n` +
          `Identify the structure of the IntentCode:\n` +
          `- H1 headings are classes, unless they are meant to be run from ` +
          `  the CLI.\n` +
          `- H2 headings are functions.\n` +
          `\n` +
          `Make an all inclusive AST tree of every required type.\n` +
          `\n` +
          `Notes:\n` +
          `- You can infer parameters and the return type used in the ` +
          `  steps.\n` +
          `\n` +
          `## Output field details\n` +  // TypeScript dialect
          `\n` +
          `The astNode can be:\n` +
          `- class\n` +
          `- type\n` +
          `- field (of type)\n` +
          `- function (of class or function)\n`+
          `- parameter (of function)\n` +
          `- type (of function's return, parameter or field)\n` +
          `\n` +
          `## Example output\n` +  // Generic
          `\n` +
          `{\n` +
          `  "warnings": [],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "to": 7,\n` +
          `      "text": "Parameters specified without a function"\n` +
          `    }\n` +
          `  ],\n` +
          `  "astTree": [\n` +
          `    {\n` +
          `      "astNode": "class",\n` +
          `      "name": "..",\n` +
          `      "attributes": [".."],\n` +
          `      "children": [\n` +
          `        {\n` +
          `          "astNode": "function",\n` +
          `          "name": ".."\n,` +
          `          "type": ".."\n` +
          `        }\n` +
          `      ]\n` +
          `    }\n` +
          `  ]\n` +
          `}\n` +
          `\n`

    // Target lang prompting
    if (targetLangPrompting.length > 0) {

      prompt +=
        `## ${targetFileExt} specific\n` +
        targetLangPrompting +
        `\n`
    }

    // Continue prompt
    prompt +=
      `## IntentCode\n` +
      `\n` +
      intentCode

    // Return
    return prompt
  }

  async processQueryResults(
          prisma: PrismaClient,
          intentFileSourceNode: SourceNode,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (intentFileSourceNode.jsonContent == null) {
      throw new CustomError(
        `${fnName}: intentFileSourceNode.jsonContent == null`)
    }

    if ((intentFileSourceNode.jsonContent as any).relativePath == null) {
      throw new CustomError(
        `${fnName}: intentFileSourceNode.jsonContent.relativePath == null`)
    }

    // Upsert the indexed data node
    const indexerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeIndexedData(
              prisma,
              intentFileSourceNode.instanceId,
              intentFileSourceNode,  // parentNode
              SourceNodeNames.indexedData,
              jsonContent,
              sourceNodeGenerationData,
              fileModifiedTime)
  }
}
