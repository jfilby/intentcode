import { ChatSettings, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { AiTechDefs } from '../../types/tech-defs'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { ChatMessage, SereneAiServerOnlyTypes } from '../../types/server-only-types'
import { AgentsService } from '../agents/agents-service'
import { GoogleGeminiLlmService } from './google-gemini/llm-api'
import { GoogleGeminiLlmUtilsService } from './google-gemini/utils'
import { OpenAIGenericLlmService } from './openai/llm-generic-service'
import { OpenAiLlmService } from './openai/llm-service'
import { OpenAiLlmUtilsService } from './openai/utils'

export class LlmUtilsService {

  // Consts
  clName = 'LlmUtilsService'

  // Models
  chatSettingsModel = new ChatSettingsModel()
  techModel = new TechModel()

  // Services
  agentsService = new AgentsService()
  googleGeminiLlmService = new GoogleGeminiLlmService()
  googleGeminiLlmUtilsService = new GoogleGeminiLlmUtilsService()
  openAIGenericLlmService = new OpenAIGenericLlmService()
  openAiLlmService = new OpenAiLlmService()
  openAiLlmUtilsService = new OpenAiLlmUtilsService()

  // Code
  buildMessagesWithRoles(
    tech: any,
    chatMessages: any[],
    fromContents: ChatMessage[],
    userChatParticipantIds: string[],
    agentChatParticipantIds: string[]) {

    // Debug
    const fnName = `${this.clName}.buildMessagesWithRoles()`

    // Route to appropriate LLM utils
    switch (tech.protocol) {

      case AiTechDefs.openAiProtocol: {
        return this.openAiLlmUtilsService.buildMessagesWithRoles(
                 chatMessages,
                 fromContents,
                 userChatParticipantIds,
                 agentChatParticipantIds)
      }

      case AiTechDefs.geminiProtocol: {
        return this.googleGeminiLlmUtilsService.buildMessagesWithRoles(
                 chatMessages,
                 fromContents,
                 userChatParticipantIds,
                 agentChatParticipantIds)
      }

      default: {
        throw new CustomError(
                    `${fnName}: unhandled protocol: ${tech.protocol} ` +
                    `for tech.id: ${tech.id}`)
      }
    }
  }

  async buildMessagesWithRolesForSinglePrompt(
          prisma: PrismaClient,
          tech: any,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.buildMessagesWithRolesForSinglePrompt()`

    // Get default/override tech if not specified
    if (tech == null) {

      tech = await
        this.techModel.getByVariantName(
          prisma,
          process.env.DEFAULT_LLM_VARIANT as string)
    }

    // Route to appropriate LLM utils
    switch (tech.protocol) {

      case AiTechDefs.openAiProtocol: {
        return this.openAiLlmUtilsService.buildMessagesWithRolesForSinglePrompt(
                 prompt)
      }

      case AiTechDefs.geminiProtocol: {
        return this.googleGeminiLlmUtilsService.buildMessagesWithRolesForSinglePrompt(
                 prompt)
      }

      default: {
        throw new CustomError(
                    `${fnName}: unhandled protocol: ${tech.protocol} ` +
                    `for tech.id: ${tech.id}`)
      }
    }
  }

  async getOrCreateChatSettings(
          prisma: PrismaClient,
          baseChatSettingsId: string | null,
          userProfileId: string,
          isEncryptedAtRest: boolean | null,
          isJsonMode: boolean | null,
          prompt: string | null,
          appCustom: any | null) {

    // Debug
    const fnName = `${this.clName}.getOrCreateChatSettings()`

    // If no baseChatSettingsId is specified, then get the default
    var chatSettings: ChatSettings | undefined
    var baseChatSettings: ChatSettings | undefined
    var defaultBaseChatSettingsId: string | null = ''

    if (baseChatSettingsId == null) {

      const baseChatSettingsMany = await
              this.chatSettingsModel.getByBaseChatSettingsId(
                prisma,
                null)

      if (baseChatSettingsMany.length > 0) {
        baseChatSettings = baseChatSettingsMany[0]
        baseChatSettingsId = baseChatSettings.id
        defaultBaseChatSettingsId = baseChatSettingsId
      }
    }

    // If a prompt is specified, then create a ChatSettings record
    var chatSettings = baseChatSettings

    if (isJsonMode != null ||
        prompt != null) {

      // Get base ChatSettings record
      if (baseChatSettingsId != null &&
          baseChatSettingsId !== defaultBaseChatSettingsId) {

        baseChatSettings = await
          this.chatSettingsModel.getById(
            prisma,
            baseChatSettingsId)
      }

      // Validation
      if (baseChatSettings == null) {
        throw new CustomError(`${fnName}: baseChatSettings == null`)
      }
    }

    // Create new ChatSettings record
    if (baseChatSettings != null &&
        (isJsonMode != null ||
         prompt != null)) {

      var thisIsEncryptedAtRest = isEncryptedAtRest
      var thisIsJsonMode = isJsonMode
      var thisPrompt = prompt

      if (baseChatSettings != null &&
          isEncryptedAtRest == null) {

        thisIsEncryptedAtRest = baseChatSettings.isEncryptedAtRest
      }

      if (baseChatSettings != null &&
          isJsonMode == null) {

        thisIsJsonMode = baseChatSettings.isJsonMode
      }

      if (baseChatSettings != null &&
          prompt == null) {

        thisPrompt = baseChatSettings.prompt
      }

      // Validate
      if (thisIsEncryptedAtRest == null) {

        throw new CustomError(`${fnName}: thisIsEncryptedAtRest == null`)
      }

      if (thisIsJsonMode == null) {

        throw new CustomError(`${fnName}: thisIsJsonMode == null`)
      }

      // Create ChatSettings record
      chatSettings = await
        this.chatSettingsModel.create(
          prisma,
          baseChatSettingsId,
          SereneAiServerOnlyTypes.activeStatus,
          thisIsEncryptedAtRest,
          thisIsJsonMode,
          false,      // isPinned
          null,       // name
          baseChatSettings.agentUserId,
          prompt,
          appCustom,
          userProfileId)
    }

    // Return
    return {
      chatSettings: chatSettings
    }
  }

  async prepareChatMessages(
          prisma: PrismaClient,
          tech: any,
          agentUser: any,
          systemPrompt: string | undefined,
          messagesWithRoles: any[]) {

    // Debug
    const fnName = `${this.clName}.prepareChatMessages()`

    // Validate
    if (agentUser == null) {
      throw new CustomError(`${fnName}: agentUser == null`)
    }

    // Route to appropriate LLM utils
    switch (tech.protocol) {

      case AiTechDefs.openAiProtocol: {

        // Prepare messages
        return this.openAIGenericLlmService.prepareMessages(
                tech,
                agentUser.name,
                agentUser.role,
                systemPrompt,
                messagesWithRoles,
                false)  // anonymize
      }

      case AiTechDefs.geminiProtocol: {

        // Prepare messages
        return await this.googleGeminiLlmService.prepareMessages(
                       tech,
                       agentUser.name,
                       agentUser.role,
                       systemPrompt,
                       messagesWithRoles,
                       false)  // anonymize
      }

      case AiTechDefs.mockedAiProtocol: {

        return {
          messages: messagesWithRoles,
          variantName: tech.variantName,
          estimatedInputTokens: AiTechDefs.mockedInputTokens,
          estimatedOutputTokens: AiTechDefs.mockedOutputTokens
        }
      }

      default: {
        throw new CustomError(
                    `${fnName}: unhandled protocol: ${tech.protocol} ` +
                    `for tech.id: ${tech.id}`)
      }
    }
  }

  async sendChatMessages(
          prisma: PrismaClient,
          tech: any,
          agentUser: any,
          systemPrompt: string | undefined,
          messages: any[],
          jsonMode: boolean) {

    // Debug
    const fnName = `${this.clName}.sendChatMessages()`

    // Route to appropriate LLM utils
    switch (tech.protocol) {

      case AiTechDefs.openAiProtocol: {

        // Prepare messages
        const prepareMessagesResults =
                this.openAIGenericLlmService.prepareMessages(
                  tech,
                  agentUser.name,
                  agentUser.role,
                  systemPrompt,
                  messages,
                  false)  // anonymize

        // Gemini LLM request
        return await this.openAiLlmService.sendChatMessages(
                       prisma,
                       tech,
                       prepareMessagesResults.messages,
                       jsonMode)
      }

      case AiTechDefs.geminiProtocol: {

        // Prepare messages
        const prepareMessagesResults =
                this.googleGeminiLlmService.prepareMessages(
                  tech,
                  agentUser.name,
                  agentUser.role,
                  systemPrompt,
                  messages,
                  false)  // anonymize

        // Gemini LLM request
        return await this.googleGeminiLlmService.sendChatMessages(
                       prisma,
                       tech,
                       prepareMessagesResults.messages,
                       jsonMode)
      }

      case AiTechDefs.mockedAiProtocol: {

        // Prepare messages
        const prepareMessagesResults =
                this.openAIGenericLlmService.prepareMessages(
                  tech,
                  agentUser.name,
                  agentUser.role,
                  systemPrompt,
                  messages,
                  false)  // anonymize

        // Return without sending to any LLM API
        return {
          status: true,
          message: undefined,
          messages: [
            'This is a mock reply message.'
          ],
          model: tech.variantName,  // Assume the same name as the variant
          actualTech: tech,
          inputTokens: AiTechDefs.mockedInputTokens,
          outputTokens: AiTechDefs.mockedOutputTokens
        }
      }

      default: {
        throw new CustomError(
                    `${fnName}: unhandled protocol: ${tech.protocol} ` +
                    `for tech.id: ${tech.id}`)
      }
    }
  }
}
