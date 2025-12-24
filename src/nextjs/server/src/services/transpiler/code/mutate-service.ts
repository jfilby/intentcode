import { PrismaClient, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { CodeMutateLlmService } from './llm-service'
import { GetTechService } from '@/services/tech/get-tech-service'

// Models
const techModel = new TechModel()

// Services
const codeMutateLlmService = new CodeMutateLlmService()
const getTechService = new GetTechService()
const usersService = new UsersService()

// Class
export class CodeMutateService {

  // Consts
  clName = 'CodeMutateService'

  // Code
  getPrompt(
    targetLang: string,
    intentcode: string) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Start the prompt
    var prompt =
          `## Instructions\n` +
          `\n` +
          `You need to convert intent code to ${targetLang} source code, ` +
          `but first scan for warnings and errors. If there are any errors ` +
          `then don't return any source.\n` +
          `\n` +
          `## Messages\n` +
          `\n` +
          `Warnings and errors might not have a line number, but they ` +
          `always have a text field.\n` +
          `\n` +
          `## Example output\n` +
          `\n` +
          `{\n` +
          `  "warnings": [\n` +
          `    {\n` +
          `      "line": 1\n` +
          `      "text": "File name has invalid chars"\n` +
          `    }\n` +
          `  ],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5\n` +
          `      "text": "Variable x in steps is undefined"\n` +
          `    }\n` +
          `  ],\n` +
          `  "source": ".."\n` +
          `}\n` +
          `\n` +
          `## Source code\n` +
          `\n` +
          intentcode

    // Return
    return prompt
  }

  processResults(queryResults: any) {

    // Get results
    return queryResults.json
  }

  async run(prisma: PrismaClient,
            targetLang: string,
            intentcode: string) {

    // Debug
    const fnName = `${this.clName}.run()`

    // console.log(`${fnName}: starting..`)

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
            getTechService.getStandardLlmTech(prisma)

    // Get prompt
    const prompt =
      this.getPrompt(
        targetLang,
        intentcode)

    // Run
    const llmResults = await
            codeMutateLlmService.llmRequest(
              prisma,
              adminUserProfile.id,
              tech,
              prompt)

    // Return
    return llmResults
  }
}
