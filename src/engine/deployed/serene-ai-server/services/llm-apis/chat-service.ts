import { PrismaClient } from '@prisma/client'
import { jsonrepair } from 'jsonrepair'
import { CustomError } from '@/serene-core-server/types/errors'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { sleepSeconds } from '@/serene-core-server/services/process/sleep'
import { ChatMessageModel } from '@/serene-core-server/models/chat/chat-message-model'
import { ChatMessageCreatedModel } from '@/serene-core-server/models/chat/chat-message-created-model'
import { ChatSessionModel } from '@/serene-core-server/models/chat/chat-session-model'
import { RateLimitedApiEventModel } from '@/serene-core-server/models/tech/rate-limited-api-event-model'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { ResourceQuotasMutateService } from '@/serene-core-server/services/quotas/mutate-service'
import { ResourceQuotasQueryService } from '@/serene-core-server/services/quotas/query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { FeatureFlags } from '../../types/feature-flags'
import { ChatMessage } from '../../types/server-only-types'
import { LlmCacheService } from '../cache/service'
import { ChatApiUsageService } from '../api-usage/chat-api-usage-service'
import { ChatMessageService } from '../chats/messages/service'
import { ChatSessionService } from '../chats/sessions/chat-session-service'
import { DetectContentTypeService } from '../content/detect-content-type-service'
import { LlmUtilsService } from './utils-service'
import { TextParsingService } from '../content/text-parsing-service'

// Models
const chatMessageCreatedModel = new ChatMessageCreatedModel()
const chatMessageModel = new ChatMessageModel(process.env.NEXT_PUBLIC_DB_ENCRYPT_SECRET)
const chatSessionModel = new ChatSessionModel()
const rateLimitedApiEventModel = new RateLimitedApiEventModel()
const resourceQuotasMutateService = new ResourceQuotasMutateService()
const techModel = new TechModel()

// Services
const chatApiUsageService = new ChatApiUsageService()
const chatMessageService = new ChatMessageService()
const chatSessionService = new ChatSessionService()
const detectContentTypeService = new DetectContentTypeService()
const llmCacheService = new LlmCacheService()
const llmUtilsService = new LlmUtilsService()
const resourceQuotasService = new ResourceQuotasQueryService()
const textParsingService = new TextParsingService()
const usersService = new UsersService()

// Class
export class ChatService {

  // Consts
  clName = 'ChatService'

  // Code
  cleanMultiLineFormatting(messages: string[]) {

    const contents: string[] = messages.join('\n').split('\n')
    var newContents: string[] = []

    for (const content of contents) {

      if (content.length < 3) {
        newContents.push(content)
      } else {
        // Check for leading chars with a space, e.g. `- ` and `o `
        if (this.isAlphaNumeric(content[0]) === false &&
            content[1] === ' ') {

          newContents.push(content.slice(2))
          continue
        }

        newContents.push(content)
      }
    }

    return newContents
  }

  convertToGenericMessageFormat(messages: any) {

    // Debug
    const fnName = `${this.clName}.convertToGenericMessageFormat()`

    // Convert
    var newMessages: any[] = []

    for (const message of messages) {

      // Try to determine the message type
      const type = detectContentTypeService.detect(message)

      // Add new message
      newMessages.push({
        type: type,
        text: message
      })
    }

    // Return
    return newMessages
  }

  isAlphaNumeric(chr: string) {

    // chr is a string that is meant to represent a single char
    const code = chr.charCodeAt(0)

    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false
    }

    return true
  }

  async llmRequest(
          prisma: PrismaClient,
          llmTech: any | undefined,
          chatSession: any,
          userProfile: any | undefined,
          agentUser: any,
          messagesWithRoles: any[],
          systemPrompt: string | undefined = undefined,
          jsonMode: boolean = false,
          tryGetFromCache: boolean = false) {

    // Debug
    const fnName = `${this.clName}.llmRequest()`

    // console.log(`${fnName}: starting..`)

    // Validate
    if (agentUser == null) {
      throw new CustomError(`${fnName}: agentUser == null`)
    }

    if (llmTech == null) {
      throw new CustomError(`${fnName}: llmTech == null`)
    }

    if (llmTech.techProvider == null) {
      throw new CustomError(`${fnName}: llmTech.techProvider == null`)
    }

    // Loop until not rate-limited
    var chatCompletionResults: any = {
      message: `${fnName}: Not initialized`
    }

    var tries = 0
    const maxTries = 5

    while (tries < maxTries) {

      // Call Gemini to get full results
      chatCompletionResults = await
        this.prepAndSendLlmRequest(
          prisma,
          llmTech,
          chatSession,
          userProfile,
          agentUser,
          messagesWithRoles,
          systemPrompt,
          jsonMode,
          tryGetFromCache)

      // HTTP 503 (service unavailable)?
      if (chatCompletionResults.statusCode === 503) {

        console.log(`${fnName}: status code 503 encountered, waiting to retry..`)
        await sleepSeconds(60)
        continue
      }

      // Validate
      if (chatCompletionResults.isRateLimited == null) {

        // Can return an errors?
        if (chatCompletionResults.status === false) {
          return chatCompletionResults
        }

        // Else throw an exception
        throw new CustomError(
                    `${fnName}: chatCompletionResults.isRateLimited == null`)
      }

      // If not rate-limited
      if (chatCompletionResults.isRateLimited === false) {

        // Inc tries
        tries += 1

        // Try to parse JSON
        if (jsonMode === true &&
            chatCompletionResults.json == null) {

          // Note: some LLMs (e.g. Google Gemini) return the JSON as text, even
          // for JSON mode.

          // Debug
          // console.log(
          //   `${fnName}: jsonMode === true, chatCompletionResults: ` +
          //   JSON.stringify(chatCompletionResults))

          // Manually parse JSON
          var jsonText = chatCompletionResults.messages[0].text

          if (jsonText.length > 0 &&
              jsonText[0] !== '[' && jsonText[0] !== '{') {

            const jsonExtracts =
                    textParsingService.getJsonExtractExcludingQuotesWithBraces(
                      jsonText)

            try {
              jsonText =
                jsonrepair(
                  jsonExtracts.extracts.join('\n').trim())
            } catch(e) {
              console.log(`${fnName}: jsonRepair failed, retrying..`)
              continue
            }
          }

          chatCompletionResults.json = JSON.parse(jsonText)
        }

        // Done
        break
      } else {
        if (chatCompletionResults.waitSeconds != null) {
          await sleepSeconds(chatCompletionResults.waitSeconds)
        }
      }
    }

    // Failed?
    if (tries === maxTries) {

      throw new CustomError(`${fnName}: failed after ${maxTries} tries`)
    }

    return chatCompletionResults
  }

  // Note: don't call directly, rather call llmRequest().
  private async prepAndSendLlmRequest(
    prisma: PrismaClient,
    llmTech: any | undefined,
    chatSession: any,
    userProfile: any,
    agentUser: any,
    messagesWithRoles: any[],
    systemPrompt: string | undefined = undefined,
    jsonMode: boolean = false,
    tryGetFromCache: boolean = false) {

    // Debug
    const fnName = `${this.clName}.prepAndSendLlmRequest()`

    // console.log(`${fnName}: starting with jsonMode: ${jsonMode} and ` +
    //   `tryGetFromCache: ${tryGetFromCache}`)

    // Validate
    if (agentUser == null) {
      throw new CustomError(`${fnName}: agentUser == null`)
    }

    // Try to cache everything? (Ignore for JSON mode, see validation below).
    if (FeatureFlags.tryCacheByDefault === true &&
        tryGetFromCache === false &&
        jsonMode === false) {

      tryGetFromCache = true
    }

    // Validate cache use
    if (jsonMode === true &&
        tryGetFromCache === true) {

      // Don't allow use of the LLM cache for JSON requests. This should be
      // done in the calling application after any required validation.
      throw new CustomError(
        `${fnName}: use of the LLM cache here, for JSON requests before ` +
        `validation, is an anti-pattern (can't proceed)`)
    }

    // If llmTechId isn't specified, get the default
    if (llmTech == null) {

      llmTech = await
        techModel.getByVariantName(
          prisma,
          process.env.DEFAULT_LLM_VARIANT as string)
    }

    if (llmTech == null) {
      throw new CustomError(`${fnName}: no default LLM tech available`)
    }

    // Get the cache key if required
    var cacheKey: string | undefined = undefined
    var inputMessageStr: string | undefined = undefined

    // Try the cache
    if (tryGetFromCache === true &&
        cacheKey != null) {

      const llmCacheResults = await
        llmCacheService.tryGet(
          prisma,
          llmTech.id,
          messagesWithRoles)

      cacheKey = llmCacheResults.cacheKey
      inputMessageStr = llmCacheResults.inputMessageStr
      const llmCache = llmCacheResults.llmCache

      if (llmCache != null) {

        var jsonEmpty: any

        return {
          status: true,
          isRateLimited: false,
          waitSeconds: 0,
          llmTechId: llmTech.id,
          fromCache: true,
          cacheKey: cacheKey,
          message: llmCache.message,
          messages: llmCache.messages,
          json: jsonEmpty,
          pricingTier: 'cached',
          inputTokens: 0,
          outputTokens: 0
        }
      }
    }

    // Get userProfileId if agent specified
    if (userProfile == null &&
        agentUser != null) {

      userProfile = await
        usersService.getById(
          prisma,
          agentUser.userProfileId)
    }

    if (userProfile == null) {
      throw new CustomError(
        `${fnName}: no userProfileId given and agent not available`)
    }

    // Debug
    // console.log(`${fnName}: rate-limit checks..`)

    // Check to see if rate limited
    const rateLimitedData = await
      chatApiUsageService.isRateLimited(
        prisma,
        llmTech.id)

    // If a rate-limited tech
    if (rateLimitedData != null) {

      if (rateLimitedData.isRateLimited === true) {

        return {
          isRateLimited: rateLimitedData.isRateLimited,
          waitSeconds: rateLimitedData.waitSeconds,
          message: undefined,
          messages: undefined,
          json: undefined,
          llmTechId: llmTech.id,
          fromCache: false,
          cacheKey: cacheKey,
        }
      }

      // Create rate-limited API event
      await rateLimitedApiEventModel.create(
        prisma,
        undefined,  // id
        rateLimitedData.rateLimitedApiId,
        userProfile.id)
    }

    // Validate the Tech
    if (llmTech.isEnabled === false) {

      return {
        status: false,
        message: `Tech is disabled for id: ${llmTech.id}`,
        isRateLimited: null
      }
    }

    // Debug
    // console.log(`${fnName}: calling llmUtilsService.prepareChatMessages..`)

    // Prepare messages by provider, but don't add the systemPrompt yet or it
    // will be added in a later step.
    const messagesResults = await
      llmUtilsService.prepareChatMessages(
        prisma,
        llmTech,
        agentUser,
        undefined,  // systemPrompt
        messagesWithRoles)

    // Debug
    // console.log(`${fnName}: calling chatMessageService.calcCostInCents..`)

    // Calc estimated cost
    const estimatedCostInCents =
      chatMessageService.calcCostInCents(
        llmTech,
        'text',
        messagesResults.estimatedInputTokens,
        messagesResults.estimatedOutputTokens)

    /* Debug
    console.log(`${fnName}: estimated costInCents: ${estimatedCostInCents} ` +
      `based on input tokens: ` +
      `${messagesResults.estimatedInputTokens} and output tokens: ` +
      `${messagesResults.estimatedOutputTokens}`) */

    // Is there quota available for this user?
    if (process.env.CHECK_USER_QUOTAS !== 'false') {

      const isQuotaAvailable = await
        resourceQuotasService.isQuotaAvailable(
          prisma,
          userProfile.id,
          SereneCoreServerTypes.credits,
          estimatedCostInCents)

      if (isQuotaAvailable === false) {

        return {
          status: false,
          message: `Insufficient quota, please buy or upgrade your subscription`,
          isRateLimited: null
        }
      }
    }

    // Send messages by provider
    const results = await
      llmUtilsService.sendChatMessages(
        prisma,
        llmTech,
        agentUser,
        systemPrompt,
        messagesResults.messages,
        jsonMode)

    // Post-proc for non-null results
    if (results != null) {

      // Calc cost
      const costInCents =
        chatMessageService.calcCostInCents(
          llmTech,
          'text',
          results.inputTokens,
          results.outputTokens)

      /* Debug
      console.log(
        `${fnName}: costInCents: ${estimatedCostInCents} based on input ` +
        `tokens: ${results.inputTokens} and output tokens: ` +
        `${results.outputTokens}`) */

      // Create ChatMessageCreated
      await chatMessageCreatedModel.create(
        prisma,
        agentUser.userProfileId,
        chatSession.instanceId,
        llmTech.id,
        true,  // sentByAi
        results.inputTokens,
        results.outputTokens,
        costInCents)

      // Inc used quota
      await resourceQuotasMutateService.incQuotaUsage(
        prisma,
        chatSession.createdById,
        SereneCoreServerTypes.credits,
        costInCents)
    }

    // Empty json
    var jsonEmpty: any = undefined

    // Get result output as a string
    var messageText = ''

    if (results != null) {

      for (const message of results.messages) {

        if (messageText.length > 0) {
          messageText += '\n'
        }

        messageText += message
      }

      // Convert to generic message format
      results.messages = this.convertToGenericMessageFormat(results.messages)

      // Add to the cache
      if (tryGetFromCache === true) {

        await llmCacheService.save(
          prisma,
          llmTech.id,
          cacheKey!,
          inputMessageStr!,
          results.message,
          results.messages,
          jsonEmpty)
        }
    } else {
      throw new CustomError(`${fnName}: results == null`)
    }

    // Return
    return {
      status: results.status,
      isRateLimited: false,
      waitSeconds: 0,
      llmTechId: llmTech.id,
      message: results.message,
      messages: results.messages,
      json: jsonEmpty,  // Set by caller, llmRequest()
      model: results.model,
      actualTech: results.actualTech,
      inputTokens: results.inputTokens,
      outputTokens: results.outputTokens,
      fromCache: false,
      cacheKey: cacheKey
    }
  }

  async runSessionTurn(
    prisma: PrismaClient,
    llmTechId: string | undefined,
    chatSessionId: string,
    fromChatParticipantId: string,
    fromUserProfile: any,
    fromName: string,
    fromContents: ChatMessage[]) {

    // Debug
    const fnName = `${this.clName}.runSessionTurn()`

    // console.log(`${fnName}: starting with chatSessionId: ` +
    //             `${chatSessionId} and llmTechId: ${llmTechId}`)

    // Get ChatSession
    const chatSession = await
            chatSessionModel.getById(
              prisma,
              chatSessionId,
              true)  // includeChatSettings

    // Debug
    // console.log(`${fnName}: chatSession: ` + JSON.stringify(chatSession))

    const agentInfo = await
            chatSessionService.getAgentInfo(
              prisma,
              chatSessionId)

    // Validate
    if (agentInfo.agentUser == null) {

      throw new CustomError(`${fnName}: agentInfo.agentUser == null`)
    }

    if (agentInfo.agentUser.maxPrevMessages == null) {

      throw new CustomError(
        `${fnName}: agentInfo.agentUser.maxPrevMessages == null`)
    }

    if (agentInfo.toChatParticipant == null) {
      throw new CustomError(`${fnName}: agentInfo.toChatParticipant == null`)
    }

    if (agentInfo.toUserProfile == null) {
      throw new CustomError(`${fnName}: agentInfo.toUserProfile == null`)
    }

    // Get chat messages
    const chatMessages = await
      chatMessageModel.getByChatSessionId(
        prisma,
        chatSession,
        agentInfo.agentUser.maxPrevMessages)

    // Get Tech
    var llmTech: any = undefined

    if (llmTechId != null) {

      llmTech = await
        techModel.getById(
          prisma,
          llmTechId)
    } else {

      // Get default tech if not specified
      llmTech = await
        techModel.getByVariantName(
          prisma,
          process.env.DEFAULT_LLM_VARIANT as string)
    }

    // Validate
    if (llmTech == null) {
      throw new CustomError(`${fnName}: llmTech == null with llmTechId: ` +
        `llmTechId: ${llmTechId}`)
    }

    // Build messagesWithRoles
    const messagesWithRoles =
      llmUtilsService.buildMessagesWithRoles(
        llmTech,
        chatMessages,
        fromContents,
        [fromChatParticipantId],
        [agentInfo.toChatParticipant.id])

    // Debug
    // console.log(`${fnName}: messagesWithRoles: ` +
    //   JSON.stringify(messagesWithRoles))

    // Call the LLM
    const chatCompletionResults = await
      this.llmRequest(
        prisma,
        llmTech,
        chatSession,
        fromUserProfile,
        agentInfo.agentUser,
        messagesWithRoles,
        chatSession.chatSettings.prompt,
        chatSession.chatSettings.isJsonMode)

    // Debug
    // console.log(`${fnName}: chatCompletionResults: ` +
    //   JSON.stringify(chatCompletionResults))

    // Handle errors
    if (chatCompletionResults.status === false) {
      return chatCompletionResults
    }

    // Return
    return {
      status: true,
      isRateLimited: false,
      waitSeconds: 0,
      chatSession: chatSession,
      fromChatParticipantId: fromChatParticipantId,
      fromUserProfileId: fromUserProfile.id,
      fromContents: fromContents,
      toChatParticipantId: agentInfo.toChatParticipant.id,
      toUserProfileId: agentInfo.toUserProfile.id,
      toName: agentInfo.agentUser.name,
      toContents: chatCompletionResults.messages,
      toJson: chatCompletionResults.json,
      tech: llmTech,
      inputTokens: chatCompletionResults.inputTokens,
      outputTokens: chatCompletionResults.outputTokens
    }
  }
}
