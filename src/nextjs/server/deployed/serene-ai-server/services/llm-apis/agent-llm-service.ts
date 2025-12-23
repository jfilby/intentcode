import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ChatSessionModel } from '@/serene-core-server/models/chat/chat-session-model'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { sleepSeconds } from '@/serene-core-server/services/process/sleep'
import { SereneAiServerOnlyTypes } from '../../types/server-only-types'
import { AgentsService } from '../agents/agents-service'
import { ChatService } from './chat-service'
import { LlmUtilsService } from './utils-service'

// Models
const chatSessionModel = new ChatSessionModel()
const chatSettingsModel = new ChatSettingsModel()
const techModel = new TechModel()

// Services
const agentsService = new AgentsService()
const chatService = new ChatService()
const llmUtilsService = new LlmUtilsService()

// Class
export class AgentLlmService {

  // Consts
  clName = 'AgentLlmService'

  // Code
  async agentSingleShotLlmRequest(
          prisma: PrismaClient,
          tech: any,
          userProfileId: string,
          instanceId: string | null,
          chatSettingsName: string,
          agentUniqueRefId: string | null,
          agentName: string,
          agentRole: string,
          prompt: string,
          isJsonMode: boolean,
          retries: number = 5,
          tryGetFromCache: boolean = false) {

    // Single-shot agent LLM request

    // Debug
    const fnName = `${this.clName}.agentSingleShotLlmRequest()`

    // Get default/override tech if not specified
    if (tech == null) {

      tech = await
        techModel.getByVariantName(
          prisma,
          process.env.DEFAULT_LLM_VARIANT as string)
    }

    // Get or create agent
    const agentUser = await
            agentsService.getOrCreate(
              prisma,
              agentUniqueRefId,
              agentName,
              agentRole,
              null)

    // Get ChatSettings
    const chatSettings = await
            chatSettingsModel.getByName(
              prisma,
              chatSettingsName)

    if (chatSettings == null) {
      throw new CustomError(`${fnName}: chatSettings == null for ` +
                            chatSettingsName)
    }

    // Create a ChatSession
    const chatSession = await
            chatSessionModel.create(
              prisma,
              undefined,  // id
              chatSettings.id,
              instanceId,
              SereneAiServerOnlyTypes.activeStatus,
              false,      // isEncryptedAtRest
              null,       // name
              null,       // externalIntegration
              null,       // externalId
              userProfileId)  // createdById

    // Build the messages
    const inputMessagesWithRoles = await
            llmUtilsService.buildMessagesWithRolesForSinglePrompt(
              prisma,
              tech,
              prompt)

    // Make the LLM request (with retries)
    var chatCompletionResults: any = undefined

    for (var i = 0; i < retries; i++) {

      // Retry log statement
      if (i > 0) {
        console.log(`${fnName}: waiting 1m before retrying..`)
        await sleepSeconds(60)
        console.log(`${fnName}: retrying: ${i+1} of ${retries}`)
      }

      // Try
      try {
        chatCompletionResults = await
          chatService.llmRequest(
            prisma,
            tech,       // llmTechId
            chatSession,
            undefined,  // userProfile
            agentUser,
            inputMessagesWithRoles,
            undefined,  // systemPrompt
            isJsonMode,
            tryGetFromCache)
      } catch (e: any) {
        console.log(`${fnName}: e: ` + JSON.stringify(e))
      }

      // Done?
      if (chatCompletionResults != null) {
        break
      }
    }

    // Validate
    if (chatCompletionResults == null) {
      throw new CustomError(`${fnName}: chatCompletionResults == null`)
    }

    // Handle status false
    if (chatCompletionResults.status === false) {
      return chatCompletionResults
    }

    // Validate
    if (chatCompletionResults.messages == null) {
      throw new CustomError(`${fnName}: no messages`)
    }

    if (isJsonMode === true &&
        chatCompletionResults.json == null) {

      throw new CustomError(`${fnName}: expected json`)
    }

    return {
      llmTechId: chatCompletionResults.llmTechId,
      cacheKey: chatCompletionResults.cacheKey,
      message: chatCompletionResults.message,
      messages: chatCompletionResults.messages,
      json: chatCompletionResults.json,
      fromCache: chatCompletionResults.fromCache
    }
  }
}
