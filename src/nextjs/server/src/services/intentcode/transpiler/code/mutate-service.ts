import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { UsersService } from '@/serene-core-server/services/users/service'
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
          `You need to:\n` +
          `1. Determine the assumptions needed in the IntentCode to make it ` +
          `   unambiguous.\n` +
          `2. Scan for warnings and errors. If there are any errors then ` +
          `   don't return any target source.\n` +
          `3. Convert IntentCode to ${targetLang} source code.\n` +
          `\n` +
          `## Assumptions\n` +
          `\n` +
          `- Different levels: file or line. The line level requires line, ` +
          `  from and to fields.\n` +
          `- Don't guess, they need to be based on high probabilities at ` +
          `  worst.\n` +
          `- Assumed imports must be based on the index data.\n` +
          `- Don't force assumptions, if you don't know something critical ` +
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
          `      "level": "file",\n` +
          `      "type": "import",\n` +
          `      "assumption": "import Calc from services/calc"\n` +
          `    }\n` +
          `  ],\n` +
          `  "warnings": [\n` +
          `    {\n` +
          `      "line": 1,\n` +
          `      "from": 2,\n` +
          `      "line": 7,\n` +
          `      "text": "File name has invalid chars"\n` +
          `    }\n` +
          `  ],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "line": 7,\n` +
          `      "text": "Variable x is undefined"\n` +
          `    }\n` +
          `  ],\n` +
          `  "targetSource": ".."\n` +
          `}\n` +
          `\n` +
          `## IntentCode\n` +
          `\n` +
          intentcode +
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
            getTechService.getStandardLlmTech(prisma)

    // Get prompt
    const prompt =
      this.getPrompt(
        targetLang,
        intentCode)

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
