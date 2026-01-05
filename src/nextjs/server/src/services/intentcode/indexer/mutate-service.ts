const fs = require('fs')
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { IndexerMutateLlmService } from './llm-service'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BuildData } from '@/types/build-types'
import { IntentCodeCommonTypes } from '../common/types'
import { LlmEnvNames, ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionsData, SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { CompilerQueryService } from '../compiler/code/query-service'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { DependenciesPromptService } from '@/services/graphs/dependencies/prompt-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeFilenameService } from '../../utils/filename-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodeMessagesService } from '../common/messages-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const dependenciesPromptService = new DependenciesPromptService()
const compilerQueryService = new CompilerQueryService()
const fsUtilsService = new FsUtilsService()
const indexerMutateLlmService = new IndexerMutateLlmService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeMessagesService = new IntentCodeMessagesService()
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
    const intentFileNode = await
            intentCodePathGraphMutateService.getOrCreateIntentCodePathAsGraph(
              prisma,
              intentCodeProjectNode,
              fullPath)

    // Check if the file has been updated since last indexed
    if (intentFileNode?.contentUpdated != null &&
        intentFileNode.contentUpdated <= fileModifiedTime) {

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
    const prompt = await
      this.getPrompt(
        prisma,
        intentCodeProjectNode,
        intentFileNode,
        buildData.extensionsData,
        targetFileExt,
        intentCode)

    // Already generated?
    var jsonContent = await
          this.getExistingJsonContent(
            prisma,
            intentFileNode,
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
            intentCodeProjectNode,
            intentFileNode,
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

  async getPrompt(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode,
          intentFileNode: SourceNode,
          extensionsData: ExtensionsData,
          targetFileExt: string,
          intentCode: string) {

    // Get rules by targetLang
    const targetLangPrompting =
            compilerQueryService.getSkillPrompting(
              extensionsData,
              targetFileExt)

    // Get deps prompting
    const depsPrompting = await
            dependenciesPromptService.getDepsPrompting(
              prisma,
              intentCodeProjectNode,
              intentFileNode)

    // Start the prompt
    var prompt = 
          `## Instructions\n` +  // TypeScript dialect
          `\n` +
          `Identify the structures in the IntentCode:\n` +
          `- H1 headings are classes, unless they are meant to be run from ` +
          `  the CLI.\n` +
          `- H2 headings are functions.\n` +
          `\n` +
          `Make an all inclusive AST tree of every required type.\n` +
          `\n` +
          `Notes:\n` +
          `- You can infer parameters and the return type used in the ` +
          `  steps.\n` +
          // The `function call` attribute is needed to make the distinction
          // between calls and definitions to produce correct code.
          `- Function calls must include the "function call" attribute.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          depsPrompting +
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
          `  ],\n` +
          `  "deps": [\n` +
          `    {\n` +
          `      "delta": "set",\n` +
          `      "name": "..",\n` +
          `      "minVersion": ".."\n` +
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
      '```md\n' +
      intentCode +
      `\n` +
      '```'

    // Return
    return prompt
  }

  async processQueryResults(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode,
          intentFileNode: SourceNode,
          sourceNodeGenerationData: SourceNodeGenerationData,
          fileModifiedTime: Date,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (intentFileNode.jsonContent == null) {
      throw new CustomError(
        `${fnName}: intentFileNode.jsonContent == null`)
    }

    if ((intentFileNode.jsonContent as any).relativePath == null) {
      throw new CustomError(
        `${fnName}: intentFileNode.jsonContent.relativePath == null`)
    }

    // Update the IntentCode node with deps
    if (jsonContent.deps != null) {

      await dependenciesMutateService.processDeps(
              prisma,
              intentCodeProjectNode,
              intentFileNode,
              jsonContent.deps)
    }

    // Upsert the indexed data node
    const indexerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeIndexedData(
              prisma,
              intentFileNode.instanceId,
              intentFileNode,  // parentNode
              SourceNodeNames.indexedData,
              jsonContent,
              sourceNodeGenerationData,
              fileModifiedTime)

    // Print warnings and errors (must be at the end of results processing)
    intentCodeMessagesService.handleMessages(jsonContent)
  }
}
