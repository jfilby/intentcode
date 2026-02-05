import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { UserTypes } from '@/serene-core-server/types/user-types'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { SereneAiServerOnlyTypes } from '../../../types/server-only-types'
import { AgentUserModel } from '../../../models/agents/agent-user-model'
import { ChatMessageModel } from '@/serene-core-server/models/chat/chat-message-model'
import { ChatParticipantModel } from '@/serene-core-server/models/chat/chat-participant-model'
import { ChatSessionModel } from '@/serene-core-server/models/chat/chat-session-model'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'
import { AgentsService } from '../../agents/agents-service'
import { ChatMessageService } from '../messages/service'
import { LlmUtilsService } from '../../llm-apis/utils-service'

// Models
const agentUserModel = new AgentUserModel()
const chatParticipantModel = new ChatParticipantModel()
const chatMessageModel = new ChatMessageModel(process.env.NEXT_PUBLIC_DB_ENCRYPT_SECRET)
const chatSessionModel = new ChatSessionModel()
const chatSettingsModel = new ChatSettingsModel()
const techModel = new TechModel()

// Services
const agentsService = new AgentsService()
const chatMessageService = new ChatMessageService()
const llmUtilsService = new LlmUtilsService()
const usersService = new UsersService()

// Class
export class ChatSessionService {

  // Consts
  clName = 'ChatSessionService'

  systemPromptPostfix =
    `Keep your answers concise and inline with the objective.\n`

  // Code
  async createChatSession(
          prisma: PrismaClient,
          baseChatSettingsId: string | null,
          userProfileId: string,
          instanceId: string | null,
          encryptedAtRest: boolean,
          jsonMode: boolean | null,
          prompt: string | null,
          appCustom: any | null,
          name: string | null,
          externalIntegration: string | null = null,
          externalId: string | null = null) {

    // Debug
    const fnName = `${this.clName}.createChatSession()`

    console.log(`${fnName}: starting with userProfileId: ${userProfileId}`)

    const chatSettingsResults = await
            llmUtilsService.getOrCreateChatSettings(
              prisma,
              baseChatSettingsId,
              userProfileId,
              encryptedAtRest,
              jsonMode,
              prompt,
              appCustom)

    // Verify that chatSettingsId is set
    if (chatSettingsResults.chatSettings == null) {
      throw new CustomError(`${fnName}: chatSettingsResults.chatSettings == null`)
    }

    var chatSettings = chatSettingsResults.chatSettings

    // Create ChatSession
    // Start in new status, only active once there are messages
    var chatSession = await
          chatSessionModel.create(
            prisma,
            undefined,  // id,
            chatSettings.id,
            instanceId,
            SereneAiServerOnlyTypes.newStatus,
            encryptedAtRest,
            name,
            externalIntegration,
            externalId,
            userProfileId)

    // Get Agent
    const agentUser = await
            agentUserModel.getById(
              prisma,
              chatSettings.agentUserId)

    // Add ChatParticipants
    var chatParticipants: any[] = []

    // console.log(`${fnName}: agentUser: ${JSON.stringify(agent)}`)

    if (agentUser == null) {
      throw new CustomError(`${fnName}: agent == null`)
    }

    // Create agent ChatParticipant
    const agentChatParticipant = await
            chatParticipantModel.upsert(
              prisma,
              undefined,  // id
              chatSession.id,
              agentUser.userProfileId)

    chatParticipants.push(agentChatParticipant)

    // Ensure ownerType is set for user
    await usersService.verifyHumanUserProfile(
            prisma,
            userProfileId)

    // Create user ChatParticipant
    const userChatParticipant = await
            chatParticipantModel.upsert(
              prisma,
              undefined,  // id
              chatSession.id,
              userProfileId)

    chatParticipants.push(userChatParticipant);

    (chatSession as any).chatParticipants = chatParticipants

    // console.log(`${fnName}: chatParticipants: ` +
    //             JSON.stringify(chatParticipants))

    // Return
    return {
      chatSession: chatSession
    }
  }

  async enrichWithChatParticipantNames(
          prisma: PrismaClient,
          chatSession: any) {

    // Debug
    const fnName = `${this.clName}.enrichWithChatParticipantNames()`

    // Iterate ChatParticipants
    for (var i = 0; i < chatSession.chatParticipants.length; i++) {

      const userProfileId = chatSession.chatParticipants[i].userProfileId

      chatSession.chatParticipants[i].name = await
        this.getChatParticipantName(
          prisma,
          userProfileId)
    }

    // Return
    return chatSession
  }

  async getAgentInfo(
          prisma: PrismaClient,
          chatSessionId: string) {

    // Debug
    const fnName = `${this.clName}.getChatMessages()`

    // Get the chatParticipant record of the bot
    const toChatParticipant = await
            chatParticipantModel.getByChatSessionIdAndOwnerType(
              prisma,
              chatSessionId,
              UserTypes.botRoleOwnerType)

    // Validate
    if (toChatParticipant == null) {
      throw new CustomError(`${fnName}: toChatParticipant == null`)
    }

    // Get the userProfileId of the bot
    const toUserProfile = await
            usersService.getById(
              prisma,
              toChatParticipant.userProfileId)

    // Validate
    if (toUserProfile == null) {
      throw new CustomError(`${fnName}: toUserProfile == null`)
    }

    // Get agent name
    const agentUser = await
            agentUserModel.getByUserProfileId(
              prisma,
              toUserProfile.id)

    // Return
    return {
      toChatParticipant: toChatParticipant,
      toUserProfile: toUserProfile,
      agentUser: agentUser
    }
  }

  async getChatMessages(
          prisma: PrismaClient,
          chatSessionId: string,
          userProfileId: string,
          lastMessageId: string | undefined) {

    // Debug
    const fnName = `${this.clName}.getChatMessages()`

    console.log(`${fnName}: starting with chatSessionId: ` +
                JSON.stringify(chatSessionId))

    // Get ChatSession record
    const chatSession = await
            chatSessionModel.getById(
              prisma,
              chatSessionId)

    // Get messages
    var chatMessages = await
          chatMessageService.getAllByChatSessionId(
            prisma,
            chatSession)

    // Enrich with names
    var chatParticipantCache = new Map<string, any>()

    for (var i = 0; i < chatMessages.length; i++) {

      // Get ChatParticipant
      const chatParticipantId = chatMessages[i].fromChatParticipantId
      var chatParticipant: any = undefined

      if (chatParticipantCache.has(chatParticipantId)) {
        chatParticipant = chatParticipantCache.get(chatParticipantId)

      } else {
        chatParticipant = await
          chatParticipantModel.getById(
            prisma,
            chatParticipantId)

        chatParticipant.name = await
          this.getChatParticipantName(
            prisma,
            chatParticipant.userProfileId)

        chatParticipantCache.set(
          chatParticipantId,
          chatParticipant)
      }

      // Set name in ChatMessage
      chatMessages[i].name = chatParticipant.name
    }

    // Return
    console.log(`${fnName}: returning..`)

    return {
      status: true,
      chatMessages: chatMessages
    }
  }

  async getChatParticipantName(
          prisma: PrismaClient,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getChatParticipantName()`

    // Get UserProfile record
    const userProfile = await
            usersService.getById(
              prisma,
              userProfileId)

    // Validate
    if (userProfile == null) {
      throw new CustomError(`${fnName}: userProfile == null`)
    }

    // Switch by ownerType
    switch (userProfile.ownerType) {

      case UserTypes.botRoleOwnerType: {
        const agentUser = await
                agentUserModel.getByUserProfileId(
                  prisma,
                  userProfileId)

        if (agentUser == null) {
          throw new CustomError(`${fnName}: agentUser == null`)
        }

        return agentUser.name
      }

      case UserTypes.humanRoleOwnerType: {
        const user = await
                usersService.getUserByUserProfileId(
                  prisma,
                  userProfileId)

        if (user != null) {
          if (user.name !== null) {
            return user.name
          }
        }

        // No name found
        return `User`
      }

      default: {
        throw new CustomError(`${fnName}: unhandled ownerType in ` +
                              `userProfile: ` + JSON.stringify(userProfile))
      }
    }
  }

  async getChatParticipants(
          prisma: PrismaClient,
          chatSessionId: string,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getChatParticipants()`

    ;
  }

  async getChatSessionById(
          prisma: PrismaClient,
          chatSessionId: string,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getChatSession()`

    // console.log(`${fnName}: starting with chatSessionId: ` +
    //             JSON.stringify(chatSessionId))

    // Get chatSession
    var chatSession = await
          chatSessionModel.getById(
            prisma,
            chatSessionId,
            true)  // includeChatSettings

    if (chatSession.createdById !== userProfileId) {

      throw new CustomError(`You aren't authorized to retrieve this chat ` +
                            `session`)
    }

    // Get participants
    chatSession.chatParticipants = await
      chatParticipantModel.getByChatSessionId(
        prisma,
        chatSession.id)

    // Return
    return {
      status: true,
      chatSession: chatSession
    }
  }

  async getChatSessions(
          prisma: PrismaClient,
          status: string,
          userProfileId: string,
          instanceId: string) {

    // Debug
    const fnName = `${this.clName}.getChatSessions()`

    // Validate
    if (userProfileId == null) {
      throw new CustomError(`${fnName}: userProfileId == null`)
    }

    // Get records
    var chatSessions = await
          chatSessionModel.filter(
            prisma,
            instanceId,
            status,
            undefined,  // isEncryptedAtRest
            undefined,  // externalIntegration
            userProfileId)

      // Validate
      if (chatSessions == null) {
        throw new CustomError(`${fnName}: chatSessions == null`)
      }

      // Prep chat sessions for return
      chatSessions = await
        this.prepChatSessionsForReturn(
          prisma,
          chatSessions)

      // Return
      return chatSessions
    }

  async getOrCreateChatSession(
          prisma: PrismaClient,
          chatSessionId: string | null,
          baseChatSettingsId: string | null,
          userProfileId: string,
          instanceId: string | null,
          encryptedAtRest: boolean,
          jsonMode: boolean | null,
          prompt: string | null,
          appCustom: any | null,
          name: string | null,
          createIfNotExists: boolean = true) {

    // Debug
    const fnName = `${this.clName}.getOrCreateChatSession()`

    // console.log(`${fnName}: starting with userProfileId: ${userProfileId}`)

    // LLM tech
    var tech

    // Try to get the chat session
    var chatSession: any = undefined

    if (chatSessionId != null) {

      chatSession = await
        chatSessionModel.getById(
          prisma,
          chatSessionId)
    }

    // console.log(`${fnName}: chatSession: ${JSON.stringify(chatSession)}`)

    if (chatSession == null) {

      // Create a chatSession
      chatSession = await
        this.createChatSession(
          prisma,
          baseChatSettingsId,
          userProfileId,
          instanceId,
          encryptedAtRest,
          jsonMode,
          prompt,
          appCustom,
          name)

      tech = chatSession.tech
    } else {
      const chatSettings = await
              chatSettingsModel.getById(
                prisma,
                chatSession.chatSettingsId)

      tech = await
        techModel.getById(
          prisma,
          chatSettings.llmTechId)
    }

    // Verify
    if (chatSession.createdById !== userProfileId) {

      return {
        status: false,
        message: `You're not authorized to view this chat`
      }
    }

    // Verify chatParticipants
    if (chatSession.chatParticipants.length === 0) {

      throw new CustomError(`${fnName}: chatSession.chatParticipants.length === 0`)
    }

    // Add ChatParticipant names
    // console.log(`${fnName}: calling this.enrichWithChatParticipantNames()..`)

    chatSession = await
      this.enrichWithChatParticipantNames(
        prisma,
        chatSession)

    return {
      status: true,
      chatSession: chatSession
    }
  }

  async prepChatSessionsForReturn(
          prisma: PrismaClient,
          chatSessions: any[]) {

    // Check if any chatSessions have a null/blank name, if not return
    var hasNullOrBlankName = false

    for (const chatSession of chatSessions) {
      if (chatSession.name == null ||
          chatSession.name.trim() === '') {

        hasNullOrBlankName = true
        break
      }
    }

    if (hasNullOrBlankName === false) {
      return chatSessions
    }

    // Get first message as name, if name not specified
    var updatedChatSessions: any[] = []

    for (var chatSession of chatSessions) {

      if (chatSession.name == null ||
          chatSession.name.trim() === '') {

        const chatMessage = await
                chatMessageModel.getFirst(
                  prisma,
                  chatSession)

        // Get message text
        var firstMessageText: string | undefined = undefined

        for (const message of JSON.parse(chatMessage.message)) {

          if (message.type === '') {
            firstMessageText = message.text
            break
          }
        }

        // Update chatMessage.name
        chatSession = await
          chatSessionModel.update(
            prisma,
            chatSession.id,
            undefined,  // chatSettingsId
            undefined,  // instanceId
            undefined,  // status
            undefined,  // isEncryptedAtRest
            firstMessageText,
            undefined,  // externalIntegration
            undefined,  // externalId
            undefined)  // createdById
      }

      // Add the chatSession, which may have been updated
      updatedChatSessions.push(chatSession)
    }

    // Return
    return updatedChatSessions
  }

  async saveMessages(
          prisma: PrismaClient,
          chatSession: any,
          sessionTurnData: any) {

    // Debug
    const fnName = `${this.clName}.saveMessages()`

    // console.log(`${fnName}: sessionTurnData: ` +
    //             JSON.stringify(sessionTurnData))

    // Switch that status from N (new) to A (active)
    if (chatSession.status === SereneAiServerOnlyTypes.newStatus) {

      chatSession = await
        chatSessionModel.update(
          prisma,
          chatSession.id,
          undefined,  // chatSettingsId
          undefined,  // instanceId
          SereneAiServerOnlyTypes.activeStatus,
          undefined,  // isEncryptedAtRest
          undefined,  // name
          undefined,  // externalIntegration
          undefined,  // externalId
          undefined)  // createdById
    }

    // Save from message
    const userChatMessage = await
            chatMessageService.saveChatMessage(
              prisma,
              chatSession,
              null,       // replyToId
              sessionTurnData.fromUserProfileId,
              sessionTurnData.fromChatParticipantId,
              sessionTurnData.toChatParticipantId,
              null,       // externalId
              false,      // sentByAi
              JSON.stringify(sessionTurnData.fromContents),
              undefined,  // tech
              undefined,  // inputTokens
              undefined)  // outputTokens

    // Save to message
    const aiReplyChatMessage = await
            chatMessageService.saveChatMessage(
              prisma,
              chatSession,
              userChatMessage.id,  // replyToId
              sessionTurnData.toUserProfileId,
              sessionTurnData.toChatParticipantId,
              sessionTurnData.fromChatParticipantId,
              null,                // externalId
              true,                // sentByAi
              JSON.stringify(sessionTurnData.toContents),
              sessionTurnData.tech,
              sessionTurnData.inputTokens,
              sessionTurnData.outputTokens)

    // Return
    return {
      status: true,
      userChatMessage: userChatMessage,
      aiReplyChatMessage: aiReplyChatMessage
    }
  }
}
