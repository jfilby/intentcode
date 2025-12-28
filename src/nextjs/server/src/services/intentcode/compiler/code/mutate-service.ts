import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { LlmEnvNames } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { CompilerMutateLlmService } from './llm-service'

// Models
const techModel = new TechModel()

// Services
const compilerMutateLlmService = new CompilerMutateLlmService()
const techQueryService = new TechQueryService()
const usersService = new UsersService()

// Class
export class CompilerMutateService {

  // Consts
  clName = 'CompilerMutateService'

  // Code
  getPrompt(
    targetLang: string,
    intentCode: string) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Start the prompt
    var prompt =
          `## Instructions\n` +
          `\n` +
          `You need to:\n` +
          `1. Determine the assumptions needed in the IntentCode to make it ` +
          `   unambiguous.\n` +
          `2. Scan for warnings and errors. If there are any errors then ` +
          `   don't return any target source.\n` +
          `3. Try to fix and errors and warnings in the fixedIntentCode ` +
          `   field.\n` +
          `4. Convert the input IntentCode (if no errors) to ${targetLang} ` +
          `   source code.\n` +
          `\n` +
          `## Assumptions\n` +
          `\n` +
          `Useful assumptions include:\n` +
          `- Importing decisions based on more than one option.\n` +
          `- Implementing functionality using known functions where ` +
          `  possible, make use of functions available in index data or ` +
          `  standard libraries.\n` +
          `\n` +
          `Do not make these assumptions:\n` +
          `- Imports not based on index data or known standard libraries.\n` +
          `\n` +
          `General rules:\n` +
          `- Include a probability from 0..1.\n ` +
          `- Different levels: file or line. The line level requires line, ` +
          `  from and to fields.\n` +
          `- Don't guess, they need to be based on high probabilities at ` +
          `  worst.\n` +
          `- Don assume without data: if you don't know something critical ` +
          `  then list it as an error.\n` +
          `\n` +
          `## Messages\n` +
          `\n` +
          `Warnings and errors might not have a line, from and to numbers, ` +
          `but they always have a text field.\n` +
          `\n` +
          `## Example output\n` +
          `\n` +
          `This is an example of the output structure only. Don't try to ` +
          `use it as a source of any kind of data.\n` +
          `\n` +
          `{\n` +
          `  "assumptions": [\n` +
          `    {\n` +
          `      "probability": "0.95",\n` +
          `      "level": "file",\n` +
          `      "type": "import",\n` +
          `      "assumption": ".."\n` +
          `    }\n` +
          `  ],\n` +
          `  "warnings": [],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "to": 7,\n` +
          `      "text": "Variable x is undefined"\n` +
          `    }\n` +
          `  ],\n` +
          `  "fixedIntentCode": "..",\n` +
          `  "targetSource": ".."\n` +
          `}\n` +
          `\n` +
          `## IntentCode\n` +
          `\n` +
          intentCode +
          `\n` +
          `## Index data\n` +
          `\n` +
          `None available.\n`

    // Return
    return prompt
  }

  processResults(queryResults: any) {

    // Get results
    return queryResults.json
  }

  async run(prisma: PrismaClient,
            targetLang: string,
            intentCode: string) {

    // Debug
    const fnName = `${this.clName}.run()`

    // console.log(`${fnName}: starting..`)

    // Check that the intentcode is fully indexed
    ;

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
              LlmEnvNames.compilerEnvName)

    // Get prompt
    const prompt =
      this.getPrompt(
        targetLang,
        intentCode)

    // Run
    const llmResults = await
            compilerMutateLlmService.llmRequest(
              prisma,
              adminUserProfile.id,
              tech,
              prompt)

    // Return
    return llmResults
  }
}
