import { PrismaClient } from '@/prisma/client.js'
import { LlmService } from '@/services/ai/llm-service.js'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { IntentCodeAiTasks, MessageTypes } from '@/types/server-only-types.js'

// Services
const dependenciesQueryService = new DependenciesQueryService()
const llmService = new LlmService()

export class CompilerLlmService {

  // Consts
  clName = 'CompilerLlmService'

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

    // The model returns a map, validated above
    const compilerData: any = structuredClone(results.json)

    // The source goes to its own field so it is not stored as meta-data
    const content = compilerData.targetSource
    compilerData.targetSource = undefined

    // OK
    return {
      status: true,
      message: undefined,
      content: content,
      jsonContent: compilerData
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

    if (json.source?.deps != null) {

      const depsValidated =
              dependenciesQueryService.verifyDepsDeltas(
                json.source.deps)

      if (depsValidated === false) {
        return false
      }
    }

    // A response with neither a targetSource nor any errors is unusable, so it
    // must fail validation and be retried. `errors == null &&` (rather than
    // `||`) short-circuited into `errors.length` on undefined and threw a
    // TypeError on every well-formed response that simply omitted 'errors'.
    const hasErrors =
      json.errors != null &&
      json.errors.length > 0

    if (json.targetSource == null &&
        hasErrors === false) {

      console.log(`${fnName}: targetSource not specified (and no errors)`)
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
