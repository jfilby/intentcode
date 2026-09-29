import { PrismaClient } from '@/prisma/client.js'
import { LlmService } from '@/services/ai/llm-service.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { BuildData } from '@/types/build-types.js'
import { FileOps, IntentCodeAiTasks } from '@/types/server-only-types.js'

// Services
const llmService = new LlmService()

export class IntentCodeAnalyzerLlmService {

  // Consts
  clName = 'IntentCodeAnalyzerLlmService'

  // Code
  async llmRequest(
          prisma: PrismaClient,
          buildData: BuildData,
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
    if (json.suggestions == null ||
        Array.isArray(json.suggestions) === false) {

      console.log(`${fnName}: json.suggestions is missing or ` +
        `not an array: ` + JSON.stringify(json))

      return false
    }

    // Validate suggestions JSON
    for (const suggestion of json.suggestions) {

      const validated =
        this.validateSuggestion(
          buildData,
          suggestion)
    }

    // Validated OK
    return true
  }

  validateSuggestion(
    buildData: BuildData,
    suggestion: any) {

    // Debug
    const fnName = `${this.clName}.validateSuggestion()`

    // Validate projectNo
    if (suggestion.priority == null ||
        ![1, 2, 3, 4, 5].includes(suggestion.priority)) {

      console.log(`${fnName}: invalid priority: ${suggestion.priority}`)
      return false
    }

    if (suggestion.text == null ||
        suggestion.text.length === 0) {

      console.log(`${fnName}: missing text`)
      return false
    }

    if (suggestion.projectNo == null ||
        !buildData.projects[suggestion.projectNo]) {

      console.log(`${fnName}: invalid projectNo: ${suggestion.projectNo}`)
      return false
    }

    // Validate fileDeltas
    for (const fileDelta of suggestion.fileDeltas) {

      // Validate fileOp
      if (fileDelta.fileOp == null ||
          ![FileOps.set, FileOps.del].includes(fileDelta.fileOp)) {

        console.log(`${fnName}: invalid fileOp: ${fileDelta.fileOp}`)
        return false
      }

      // Validate relativePath
      if (fileDelta.relativePath == null ||
          fileDelta.relativePath.length === 0) {

        console.log(
          `${fnName}: invalid relativePath: ${fileDelta.relativePath}`)

        return false
      }

      // Validate change
      if (fileDelta.fileDelta === FileOps.set &&
          (fileDelta.change == null ||
           fileDelta.change.length === 0)) {

        console.log(
          `${fnName}: invalid change (for set): ${fileDelta.change}`)

        return false
      }
    }

    // Validated OK
    return true
  }
}
