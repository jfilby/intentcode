import { PrismaClient, Tech } from '@prisma/client'
import { LlmCacheService } from '@/serene-ai-server/services/cache/service'
import { AgentLlmService } from '@/serene-ai-server/services/llm-apis/agent-llm-service'
import { LlmUtilsService } from '@/serene-ai-server/services/llm-apis/utils-service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { BuildData } from '@/types/build-types'
import { FileDeltas, MessageTypes, ServerOnlyTypes } from '@/types/server-only-types'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service'

// Services
const agentLlmService = new AgentLlmService()
const dependenciesQueryService = new DependenciesQueryService()
const llmCacheService = new LlmCacheService()
const llmUtilsService = new LlmUtilsService()

export class IntentCodeAnalyzerLlmService {

  // Consts
  clName = 'IntentCodeAnalyzerLlmService'

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
      const jsonContent = cacheResults.llmCache?.outputJson

      // Found?
      if (queryResults != null) {
        return {
          status: true,
          message: undefined,
          jsonContent: jsonContent
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
      jsonContent: queryResults.json
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

      console.log(`${fnName}: queryResults.json should be an object: ` +
        JSON.stringify(queryResults))

      return false
    }

    // Validate the JSON
    if (queryResults.json.suggestions == null ||
        Array.isArray(queryResults.json.suggestions) === false) {

      console.log(`${fnName}: queryResults.json.suggestions is missing or ` +
        `not an array: ` + JSON.stringify(queryResults))

      return false
    }

    // Validate suggestions JSON
    for (const suggestion of queryResults.json.suggestions) {

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
        !['1', '2', '3', '4', '5'].includes(suggestion.priority)) {

      console.log(`${fnName}: invalid priority: ${suggestion.priority}`)
      return false
    }

    if (suggestion.text == null ||
        suggestion.text.length === 0) {

      console.log(`${fnName}: missing text`)
      return false
    }

    if (suggestion.projectNo == null ||
        !buildData.projectsMap.has(suggestion.projectNo)) {

      console.log(`${fnName}: invalid projectNo: ${suggestion.projectNo}`)
      return false
    }

    // Validae fileDeltas
    for (const fileDelta of suggestion.fileDeltas) {

      // Validate fileDelta
      if (fileDelta.fileDelta == null ||
          ![FileDeltas.set, FileDeltas.del].includes(fileDelta.fileDelta)) {

        console.log(`${fnName}: invalid fileDelta: ${fileDelta.fileDelta}`)
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
      if (fileDelta.fileDelta === FileDeltas.set &&
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
