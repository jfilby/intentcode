import type { ProjectStore } from '@/core/store.js'
import { LlmService } from '@/services/ai/llm-service.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { BuildData } from '@/types/build-types.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'
import { IntentCodeUpdaterQueryService } from '../updater/query-service.js'

// Services
const intentCodeUpdaterQueryService = new IntentCodeUpdaterQueryService()
const llmService = new LlmService()

export class IntentCodeAnalyzerSuggestionsLlmService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsLlmService'

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
      jsonContent: results.json
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

      console.log(`${fnName}: json should be an object: ` +
        JSON.stringify(json))

      return false
    }

    // Validate the JSON
    if (json.intentCode == null ||
        Array.isArray(json.intentCode) === false) {

      console.log(`${fnName}: json.intentCode is missing or ` +
        `not an array: ` + JSON.stringify(json))

      return false
    }

    // Validate intentCode JSON
    if (intentCodeUpdaterQueryService.validateFileDelta(
          buildData,
          json.intentCode) === false) {

      return false
    }

    // Validated OK
    return true
  }
}
