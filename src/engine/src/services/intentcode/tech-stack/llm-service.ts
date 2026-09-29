import { PrismaClient } from '@/prisma/client.js'
import { LlmService } from '@/services/ai/llm-service.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { IntentCodeAiTasks, MessageTypes } from '@/types/server-only-types.js'

// Services
const llmService = new LlmService()

export class TechStackLlmService {

  // Consts
  clName = 'TechStackLlmService'

  // Code
  async llmRequest(
          prisma: PrismaClient,
          aiTask: IntentCodeAiTasks,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.llmRequest()`

    // The request
    const results = await
      llmService.request({
        prisma: prisma,
        aiTask: aiTask,
        system: BaseDataTypes.coderAgentRole,
        prompt: prompt,
        isJsonMode: true,
        validate: (json) => this.validateQueryResults(json)
      })

    // OK
    return {
      status: true,
      message: undefined,
      queryResultsJson: results.json
    }
  }

  async validateQueryResults(
          json: any) {

    // Debug
    const fnName = `${this.clName}.validateQueryResults()`

    // Test for concept graph results. This may not be a concept graph if the
    // text to analyze overrode the prompt.
    if (Array.isArray(json) === true) {

      console.log(`${fnName}: json should be a map: ` +
                  JSON.stringify(json))

      return false
    }

    // Validate the JSON
    if (json.warnings != null) {

      const entryValidated =
              this.validateMessages(
                MessageTypes.warnings,
                json.warnings)

      if (entryValidated === false) {
        return false
      }
    }

    if (json.errors != null) {

      const entryValidated =
              this.validateMessages(
                MessageTypes.errors,
                json.errors)

      if (entryValidated === false) {
        return false
      }
    }

    // extensions is required and can't be an array
    if (json.extensions == null ||
        Array.isArray(json.deps)) {

      console.log(`${fnName}: invalid extensions`)
      return false
    }

    // deps is optional, but can't be an array
    if (json.deps != null &&
        Array.isArray(json.deps)) {

      console.log(`${fnName}: invalid deps`)
      return false
    }

    // Validated OK
    return true
  }

  validateMessages(
    name: string,
    messages: any[]) {

    // Debug
    const fnName = `${this.clName}.validateMessages()`

    // console.log(`${fnName}: messages: ` + JSON.stringify(messages))

    // Validate array structure
    if (Array.isArray(messages) === false) {

      console.log(`${fnName}: ${name} isn't an array`)
      return false
    }

    for (const message of messages) {

      if (message.text == null) {

        console.log(`${fnName}: ${name} message is missing text`)
        return false
      }
    }

    // Validated OK
    return true
  }
}
