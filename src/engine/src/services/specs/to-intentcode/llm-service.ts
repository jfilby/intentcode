import { LlmService } from '@/services/ai/llm-service.js'
import { IntentCodeUpdaterQueryService } from '@/services/intentcode/updater/query-service.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { BuildData } from '@/types/build-types.js'
import { IntentCodeAiTasks, MessageTypes } from '@/types/server-only-types.js'
import type { ProjectStore } from '@/core/store.js'

// Services
const intentCodeUpdaterQueryService = new IntentCodeUpdaterQueryService()
const llmService = new LlmService()

export class SpecsLlmService {

  // Consts
  clName = 'SpecsLlmService'

  // Code
  async llmRequest(
          store: ProjectStore,
          buildData: BuildData,
          aiTask: IntentCodeAiTasks,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.llmRequest()`

    // The request
    const results = await
      llmService.request({
        store: store,
        aiTask: aiTask,
        system: BaseDataTypes.coderAgentRole,
        prompt: prompt,
        isJsonMode: true,
        validate: (json) => this.validateQueryResults(
          buildData,
          json)
      })

    // OK
    return {
      status: true,
      message: undefined,
      queryResultsJson: results.json
    }
  }

  async validateQueryResults(
          buildData: BuildData,
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
    if (json.intentCode == null ||
        !Array.isArray(json.intentCode)) {

      console.log(`${fnName}: invalid intentcode`)
      return false
    }

    // Iterate intentcode entries
    if (intentCodeUpdaterQueryService.validateFileDelta(
          buildData,
          json.intentCode) === false) {

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
