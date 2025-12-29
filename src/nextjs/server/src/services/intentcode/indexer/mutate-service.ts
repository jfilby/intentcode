const fs = require('fs')
import { PrismaClient, SourceNode } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { IndexerMutateLlmService } from './llm-service'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir'
import { LlmEnvNames } from '@/types/server-only-types'
import { SourceNodeNames } from '@/types/source-graph-types'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeFilenameService } from '../../utils/filename-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'

// Services
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
  async indexFileWithLlm(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode,
          fullPath: string,
          targetLang: string,
          intentCode: string,
          fileModifiedTime: Date) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

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
        targetLang,
        intentCode)

    // Run
    const llmResults = await
            indexerMutateLlmService.llmRequest(
              prisma,
              adminUserProfile.id,
              tech,
              prompt)

    // Save the index data
    await this.processQueryResults(
            prisma,
            intentFileSourceNode,
            fileModifiedTime,
            llmResults.queryResults.json)

    // Return
    return
  }

  async indexProject(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.indexProject()`

    // Walk dir
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            intentCodeProjectNode.path!,
            intentCodeList)

    // Analyze each file
    for (const intentCodeFilename of intentCodeList) {

      // Get last save time of the file
      const fileModifiedTime = await
              fsUtilsService.getLastUpdateTime(intentCodeFilename)

      // Get targetLang
      const targetLang =
              intentCodeFilenameService.getTargetLang(intentCodeFilename)

      if (targetLang == null) {
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
              intentCodeProjectNode,
              intentCodeFilename,
              intentCode,
              targetLang,
              fileModifiedTime)
    }
  }

  getPrompt(
    targetLang: string,
    intentCode: string) {

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
          `\n` +
          `## IntentCode\n` +
          `\n` +
          intentCode

    return prompt
  }

  async processQueryResults(
          prisma: PrismaClient,
          intentFileSourceNode: SourceNode,
          fileModifiedTime: Date,
          json: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (json.astTree == null) {
      return
    }

    if (intentFileSourceNode.jsonContent == null) {
      throw new CustomError(
        `${fnName}: intentFileSourceNode.jsonContent == null`)
    }

    if ((intentFileSourceNode.jsonContent as any).relativePath == null) {
      throw new CustomError(
        `${fnName}: intentFileSourceNode.jsonContent.relativePath == null`)
    }

    // Define jsonContent with relative path of the file
    const jsonContent = {
      astTree: json.astTree
    }

    // Upsert the indexed data node
    const indexerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeIndexedData(
              prisma,
              intentFileSourceNode.instanceId,
              intentFileSourceNode,  // parentNode
              SourceNodeNames.indexedData,
              jsonContent,
              fileModifiedTime)
  }
}
