const fs = require('fs')
import { PrismaClient } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { IndexerMutateLlmService } from './llm-service'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir'
import { LlmEnvNames } from '@/types/server-only-types'
import { IntentCodeFilenameService } from '../../utils/filename-service'

// Services
const indexerMutateLlmService = new IndexerMutateLlmService()
const intentCodeFilenameService = new IntentCodeFilenameService()
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
          targetLang: string,
          intentCode: string) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

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
            llmResults.queryResults.json)

    // Return
    return llmResults
  }

  async indexProject(
          prisma: PrismaClient,
          path: string) {

    // Debug
    const fnName = `${this.clName}.indexProject()`

    // Walk dir
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            `${path}/intent`,
            intentCodeList)

    // Analyze each file
    for (const intentCodeFilename of intentCodeList) {

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
              intentCode,
              targetLang)
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
          json: any) {

    // Save a graph for the file with dirs
    ;

    // AST tree present?
    if (json.astTree == null) {
      return
    }

    // Parse and save the AST tree
    ;
  }
}
