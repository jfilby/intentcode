import { PrismaClient, Tech } from '@prisma/client'
import { FeatureFlags } from '@/serene-ai-server/types/feature-flags'
import { LlmCacheService } from '@/serene-ai-server/services/cache/service'
import { AgentLlmService } from '@/serene-ai-server/services/llm-apis/agent-llm-service'
import { LlmUtilsService } from '@/serene-ai-server/services/llm-apis/utils-service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { MessageTypes, ServerOnlyTypes } from '@/types/server-only-types'

// Services
const agentLlmService = new AgentLlmService()
const llmCacheService = new LlmCacheService()
const llmUtilsService = new LlmUtilsService()

export class CodeMutateLlmService {

  // Consts
  clName = 'CodeMutateLlmService'

  // Code
  async llmRequest(
          prisma: PrismaClient,
          userProfileId: string,
          llmTech: Tech,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.llmRequest()`

    // Try to get from cache
    var cacheKey: string | undefined = undefined
    var inputMessageStr: string | undefined = undefined
    var queryResults: any = undefined

    if (FeatureFlags.tryCacheByDefault === true) {

      // Build the messageWithRoles
      const inputMessagesWithRoles = await
              llmUtilsService.buildMessagesWithRolesForSinglePrompt(
                prisma,
                llmTech,
                prompt)

      // Try get from the cache
      const cacheResults = await
              llmCacheService.tryGet(
                prisma,
                llmTech.id,
                inputMessagesWithRoles)

      cacheKey = cacheResults.cacheKey
      inputMessageStr = cacheResults.inputMessageStr
      queryResults = cacheResults.llmCache

      // Found?
      if (queryResults != null) {
        return {
          status: true,
          message: undefined,
          queryResults: queryResults
        }
      }
    }

    // LLM request tries
    var validated = false

    for (var i = 0; i < 5; i++) {

      // LLM request
      queryResults = await
        agentLlmService.agentSingleShotLlmRequest(
          prisma,
          llmTech,
          userProfileId,
          null,       // instanceId,
          BaseDataTypes.defaultChatSettingsName,
          BaseDataTypes.coderAgentRefId,
          BaseDataTypes.coderAgentName,
          BaseDataTypes.coderAgentRole,
          prompt,
          true)       // isJsonMode

      // Validate
      validated = true

      if (queryResults == null ||
          queryResults.json == null) {

        validated = false
      } else {
        validated = await
          this.validateQueryResults(
            prisma,
            queryResults)
      }

      if (validated === false) {

        // Delete from cache (if relevant)
        if (cacheKey != null) {

          await llmCacheService.deleteByTechIdAndKey(
                  prisma,
                  llmTech.id,
                  cacheKey)
        }

        // Retry
        continue
      }

      // Passed validation: save to cache (if relevant) and exit loop
      if (cacheKey != null) {

        await llmCacheService.save(
                prisma,
                llmTech.id,
                cacheKey!,
                inputMessageStr!,
                queryResults.message,
                queryResults.messages)
      }

      break
    }

    // Validate
    if (validated === false) {

      console.log(`${fnName}: failed validation after retries`)

      return {
        status: false,
        message: `${fnName}: failed validation`
      }
    }

    // OK
    return {
      status: true,
      message: undefined,
      queryResults: queryResults
    }
  }

  async validateQueryResults(
          prisma: PrismaClient,
          queryResults: any) {

    // Debug
    const fnName = `${this.clName}.validateQueryResults()`

    // Test for concept graph results. This may not be a concept graph if the
    // text to analyze overrode the prompt.
    if (Array.isArray(queryResults.json) === true) {

      console.log(`${fnName}: queryResults.json should be a map: ` +
                  JSON.stringify(queryResults))

      return false
    }

    // Validate the JSON
    if (queryResults.json.warnings != null) {

      const entryValidated =
              this.validateMessages(
                MessageTypes.warnings,
                queryResults.json.warnings)

      if (entryValidated === false) {
        return false
      }
    }

    if (queryResults.json.errors != null) {

      const entryValidated =
              this.validateMessages(
                MessageTypes.errors,
                queryResults.json.errors)

      if (entryValidated === false) {
        return false
      }
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
