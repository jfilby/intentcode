import { PrismaClient, Tech } from '@prisma/client'
import { FeatureFlags } from '@/serene-ai-server/types/feature-flags'
import { LlmCacheService } from '@/serene-ai-server/services/cache/service'
import { AgentLlmService } from '@/serene-ai-server/services/llm-apis/agent-llm-service'
import { LlmUtilsService } from '@/serene-ai-server/services/llm-apis/utils-service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { BuildData } from '@/types/build-types'
import { MessageTypes, ServerOnlyTypes } from '@/types/server-only-types'

// Services
const agentLlmService = new AgentLlmService()
const llmCacheService = new LlmCacheService()
const llmUtilsService = new LlmUtilsService()

export class SpecsMutateLlmService {

  // Consts
  clName = 'SpecsMutateLlmService'

  // Code
  async llmRequest(
          prisma: PrismaClient,
          buildData: BuildData,
          userProfileId: string,
          llmTech: Tech,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.llmRequest()`

    // Try to get from cache
    var cacheKey: string | undefined = undefined
    var inputMessageStr: string | undefined = undefined

    if (ServerOnlyTypes.llmCaching === true) {

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
      const queryResultsJson = cacheResults.llmCache?.outputJson

      // Found?
      if (queryResultsJson != null) {
        return {
          status: true,
          message: undefined,
          queryResultsJson: queryResultsJson
        }
      }
    }

    // LLM request tries
    var queryResults: any = undefined
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

      // Debug
      // console.log(`${fnName}: json: ` + JSON.stringify(queryResults.json))

      // Validate
      validated = true

      if (queryResults == null ||
          queryResults.json == null) {

        console.error(`${fnName}: null results: ` +
          JSON.stringify(queryResults))

        validated = false
      } else {
        validated = await
          this.validateQueryResults(
            prisma,
            buildData,
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
                queryResults.messages,
                queryResults.json)
      }

      break
    }

    // Validate
    if (validated === false) {

      console.log(`${fnName}: failed validation after retries`)
      process.exit(1)
    }

    // OK
    return {
      status: true,
      message: undefined,
      queryResultsJson: queryResults.json
    }
  }

  async validateQueryResults(
          prisma: PrismaClient,
          buildData: BuildData,
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

    // extensions is required and can't be an array
    if (queryResults.json.intentcode == null ||
        !Array.isArray(queryResults.json.intentcode)) {

      console.log(`${fnName}: invalid intentcode`)
      return false
    }

    // Iterate intentcode entries
    if (this.validateIntentcode(
          buildData,
          queryResults.json.intentcode) === false) {

      return false
    }

    // Validated OK
    return true
  }

  validateIntentcode(
    buildData: BuildData,
    intentcode: any[]) {

    // Debug
    const fnName = `${this.clName}.validateIntentcode()`

    // Validate each entries
    for (const entry of intentcode) {

      // Validate projectNo
      if (!buildData.projectsMap.has(entry.projectNo)) {

        console.log(`${fnName}: invalid projectNo: ${entry.projectNo}`)
        return false
      }

      // Validate fileDelta
      if (entry.fileDelta == null ||
          !['set', 'delete'].includes(entry.fileDelta)) {

        console.log(`${fnName}: invalid fileDelta: ${entry.fileDelta}`)
        return false
      }

      // Validate relativePath
      if (entry.relativePath == null ||
          entry.relativePath.length === 0) {

        console.log(`${fnName}: invalid relativePath: ${entry.relativePath}`)
        return false
      }

      // Validate content
      if (entry.fileDelta === 'set' &&
          (entry.content == null ||
           entry.content.length === 0)) {

        console.log(`${fnName}: invalid content (for set): ${entry.content}`)
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
