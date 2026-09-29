import { v4 as uuidv4 } from 'uuid'
import { CustomError } from 'serene-core-server'
import {
  AgentUser,
  ChatMessage as ChatMessageRecord,
  ChatParticipant,
  ChatSession,
  PrismaClient,
  UserProfile
} from '@/prisma/client.js'
import { ChatMessage } from '@/types/ai-types.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ChatParticipantRoles } from '@/types/chat-types.js'

// Contract
export interface ChatParticipants {
  user: ChatParticipant
  agent: ChatParticipant
}

export interface ChatSessionTurnData {
  chatSession: ChatSession
  toChatParticipant: ChatParticipant
  toUserProfile: UserProfile
  agentUser: AgentUser
  fromContents: ChatMessage[]
  toContents: ChatMessage[]
  toJson: unknown
}

// Class
export class ChatSessionService {

  // Consts
  clName = 'ChatSessionService'

  // Code
  async createChatSession(
          prisma: PrismaClient,
          baseChatSettingsId: string,
          userProfileId: string,
          instanceId: string | null,
          isEncryptedAtRest: boolean,
          isJsonMode: boolean | null,
          prompt: string | null,
          appCustom: unknown,
          name: string | null) {

    // Debug
    const fnName = `${this.clName}.createChatSession()`

    // The base ChatSettings carries the agent; the session gets its own copy
    // so the per-session prompt and appCustom don't leak into other sessions
    const baseChatSettings = await
      prisma.chatSettings.findFirst({
        where: {
          id: baseChatSettingsId
        }
      })

    if (baseChatSettings == null) {
      throw new CustomError(`${fnName}: baseChatSettings == null`)
    }

    const chatSettings = await
      prisma.chatSettings.create({
        data: {
          baseChatSettingsId: baseChatSettingsId,
          status: BaseDataTypes.activeStatus,
          isEncryptedAtRest: isEncryptedAtRest,
          isJsonMode: isJsonMode ?? false,
          isPinned: false,
          name: null,
          agentUserId: baseChatSettings.agentUserId,
          prompt: prompt,
          appCustom: appCustom as never,
          createdById: userProfileId
        }
      })

    // Create the session
    const chatSession = await
      prisma.chatSession.create({
        data: {
          chatSettingsId: chatSettings.id,
          instanceId: instanceId,
          status: BaseDataTypes.activeStatus,
          isEncryptedAtRest: isEncryptedAtRest,
          token: uuidv4(),
          name: name,
          externalIntegration: null,
          externalId: null,
          createdById: userProfileId
        }
      })

    // The two participants
    const chatParticipant = await
      prisma.chatParticipant.create({
        data: {
          chatSessionId: chatSession.id,
          userProfileId: userProfileId,
          role: ChatParticipantRoles.user
        }
      })

    await prisma.chatParticipant.create({
      data: {
        chatSessionId: chatSession.id,
        userProfileId: userProfileId,
        role: ChatParticipantRoles.agent
      }
    })

    // Return
    return {
      chatSession: chatSession,
      chatParticipant: chatParticipant
    }
  }

  async getChatSessionById(
          prisma: PrismaClient,
          chatSessionId: string,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.getChatSessionById()`

    // Query
    const chatSession = await
      prisma.chatSession.findFirst({
        where: {
          id: chatSessionId,
          createdById: userProfileId
        },
        include: {
          chatSettings: {
            include: {
              agentUser: true
            }
          },
          ofChatParticipants: true
        }
      })

    // Not found?
    if (chatSession == null) {
      console.error(`${fnName}: chatSession not found: ${chatSessionId}`)
      return {
        status: false,
        chatSession: undefined
      }
    }

    // The user's participant
    const chatParticipant = chatSession.ofChatParticipants.find(
      (participant) => participant.role === ChatParticipantRoles.user)

    if (chatParticipant == null) {
      throw new CustomError(`${fnName}: chatParticipant == null`)
    }

    // Return
    return {
      status: true,
      chatSession: chatSession,
      chatParticipant: chatParticipant
    }
  }

  // The agent identity, for the failure path
  async getAgentInfo(
          prisma: PrismaClient,
          chatSessionId: string) {

    // Debug
    const fnName = `${this.clName}.getAgentInfo()`

    // Query
    const chatSession = await
      prisma.chatSession.findFirst({
        where: {
          id: chatSessionId
        },
        include: {
          chatSettings: {
            include: {
              agentUser: true
            }
          }
        }
      })

    // Validate
    if (chatSession == null) {
      throw new CustomError(`${fnName}: chatSession == null`)
    }

    // The agent participant
    const chatParticipants = await
      this.getParticipants(
        prisma,
        chatSessionId)

    // Return
    return {
      toChatParticipant: chatParticipants.agent,
      agentUser: chatSession.chatSettings.agentUser
    }
  }

  // The history for the prompt, oldest first
  async getChatMessages(
          prisma: PrismaClient,
          chatSessionId: string,
          maxMessages: number | null) {

    // Debug
    const fnName = `${this.clName}.getChatMessages()`

    // Query the newest messages, then flip them
    const chatMessages = await
      prisma.chatMessage.findMany({
        where: {
          chatSessionId: chatSessionId
        },
        orderBy: {
          created: 'desc'
        },
        take: maxMessages ?? undefined
      })

    // Return
    return {
      status: true,
      chatMessages: chatMessages.reverse()
    }
  }

  async saveMessages(
          prisma: PrismaClient,
          chatSession: ChatSession,
          sessionTurnData: ChatSessionTurnData) {

    // Debug
    const fnName = `${this.clName}.saveMessages()`

    // The two participants
    const chatParticipants = await
      this.getParticipants(
        prisma,
        chatSession.id)

    // The user's message
    const userChatMessage = await
      this.createChatMessage(
        prisma,
        chatSession.id,
        chatParticipants.user.id,
        chatParticipants.agent.id,
        false,
        joinContents(sessionTurnData.fromContents))

    // The agent's reply
    const aiReplyChatMessage = await
      this.createChatMessage(
        prisma,
        chatSession.id,
        chatParticipants.agent.id,
        chatParticipants.user.id,
        true,
        joinContents(sessionTurnData.toContents),
        userChatMessage.id)

    // Return
    return {
      status: true,
      userChatMessage: userChatMessage,
      aiReplyChatMessage: aiReplyChatMessage
    }
  }

  async getParticipants(
          prisma: PrismaClient,
          chatSessionId: string): Promise<ChatParticipants> {

    // Debug
    const fnName = `${this.clName}.getParticipants()`

    // Query
    const chatParticipants = await
      prisma.chatParticipant.findMany({
        where: {
          chatSessionId: chatSessionId
        }
      })

    // Split by role
    const user =
      chatParticipants.find(
        (participant) => participant.role === ChatParticipantRoles.user)

    const agent =
      chatParticipants.find(
        (participant) => participant.role === ChatParticipantRoles.agent)

    // Validate
    if (user == null ||
        agent == null) {

      throw new CustomError(`${fnName}: the session needs a user and an ` +
        `agent participant`)
    }

    // Return
    return {
      user: user,
      agent: agent
    }
  }

  async createChatMessage(
          prisma: PrismaClient,
          chatSessionId: string,
          fromChatParticipantId: string,
          toChatParticipantId: string,
          sentByAi: boolean,
          message: string,
          replyToId?: string): Promise<ChatMessageRecord> {

    // Debug
    const fnName = `${this.clName}.createChatMessage()`

    // Create record
    return await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSessionId,
        replyToId: replyToId,
        fromChatParticipantId: fromChatParticipantId,
        toChatParticipantId: toChatParticipantId,
        externalId: null,
        sentByAi: sentByAi,
        message: message
      }
    })
  }
}

// The model sees text, so the pieces are concatenated
function joinContents(contents: ChatMessage[]) {

  // Join
  return contents
    .map((content) => content.text)
    .filter((text) => text !== ``)
    .join(`\n\n`)
}
