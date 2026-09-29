import { createId } from '@/core/ids.js'
import { IntentError } from '@/core/errors.js'
import type {
  AgentUserRecord,
  ChatMessageRecord,
  ChatParticipantRecord,
  ChatSessionWithSettings
} from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { ChatMessage } from '@/types/ai-types.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ChatParticipantRoles } from '@/types/chat-types.js'

// Contract
export interface ChatParticipants {
  user: ChatParticipantRecord
  agent: ChatParticipantRecord
}

export interface ChatSessionTurnData {
  chatSession: ChatSessionWithSettings
  toChatParticipant: ChatParticipantRecord
  agentUser: AgentUserRecord
  fromContents: ChatMessage[]
  toContents: ChatMessage[]
  toJson: unknown
}

// Class
export class ChatSessionService {

  // Consts
  clName = 'ChatSessionService'

  // Code

  // A session points at one of the chat settings seeded at setup, which is
  // what names the agent answering it. The settings a session is started with
  // carry its own prompt and app data, so those are written to the settings
  // record: it is the one place a session's framing is kept, and a chat
  // configuration is used by one chat at a time.
  async createChatSession(
          store: ProjectStore,
          baseChatSettingsId: string,
          projectId: string | null,
          isEncryptedAtRest: boolean,
          isJsonMode: boolean | null,
          prompt: string | null,
          appCustom: unknown,
          name: string | null) {

    // Debug
    const fnName = `${this.clName}.createChatSession()`

    // The chat settings carrying the agent
    const baseChatSettings = await
      store.chatSettings.findFirst({
        where: {
          id: baseChatSettingsId
        }
      })

    if (baseChatSettings == null) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `baseChatSettings == null: ${baseChatSettingsId}`
      })
    }

    // The session's own framing
    await store.chatSettings.update({
      where: {
        id: baseChatSettingsId
      },
      data: {
        isJsonMode: isJsonMode ?? baseChatSettings.isJsonMode,
        prompt: prompt,
        appCustom: appCustom
      }
    })

    // Create the session
    const created = new Date().toISOString()

    const chatSession = await
      store.chatSessions.create({
        data: {
          id: createId(),
          chatSettingsId: baseChatSettingsId,
          projectId: projectId,
          status: BaseDataTypes.activeStatus,
          isEncryptedAtRest: isEncryptedAtRest,
          externalId: null,
          name: name,
          created: created,
          updated: created
        }
      })

    // The two participants
    const chatParticipant = await
      store.chatParticipants.create({
        data: {
          id: createId(),
          chatSessionId: chatSession.id,
          role: ChatParticipantRoles.user,
          created: created
        }
      })

    await store.chatParticipants.create({
      data: {
        id: createId(),
        chatSessionId: chatSession.id,
        role: ChatParticipantRoles.agent,
        created: created
      }
    })

    // Return
    return {
      chatSession: chatSession,
      chatParticipant: chatParticipant
    }
  }

  async getChatSessionById(
          store: ProjectStore,
          chatSessionId: string) {

    // Debug
    const fnName = `${this.clName}.getChatSessionById()`

    // Query
    const chatSession = await
      store.chatSessions.findFirst({
        where: {
          id: chatSessionId
        },
        include: {
          chatSettings: true,
          agentUser: true
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
    const chatParticipant = await
      store.chatParticipants.findFirst({
        where: {
          chatSessionId: chatSessionId,
          role: ChatParticipantRoles.user
        }
      })

    if (chatParticipant == null) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `chatParticipant == null: ${chatSessionId}`
      })
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
          store: ProjectStore,
          chatSessionId: string) {

    // Debug
    const fnName = `${this.clName}.getAgentInfo()`

    // Query
    const chatSession = await
      store.chatSessions.findFirst({
        where: {
          id: chatSessionId
        },
        include: {
          chatSettings: true,
          agentUser: true
        }
      })

    // Validate
    if (chatSession == null) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `chatSession == null: ${chatSessionId}`
      })
    }

    // The agent participant
    const chatParticipants = await
      this.getParticipants(
        store,
        chatSessionId)

    // Return
    return {
      toChatParticipant: chatParticipants.agent,
      agentUser: chatSession.agentUser
    }
  }

  // The history for the prompt, oldest first
  async getChatMessages(
          store: ProjectStore,
          chatSessionId: string,
          maxMessages: number | null) {

    // Debug
    const fnName = `${this.clName}.getChatMessages()`

    // Query the newest messages, then flip them
    const chatMessages = await
      store.chatMessages.findMany({
        where: {
          chatSessionId: chatSessionId
        },
        orderBy: {
          created: 'desc'
        }
      })

    const newestFirst = maxMessages == null
      ? chatMessages
      : chatMessages.slice(0, maxMessages)

    // Return
    return {
      status: true,
      chatMessages: newestFirst.reverse()
    }
  }

  async saveMessages(
          store: ProjectStore,
          chatSession: ChatSessionWithSettings,
          sessionTurnData: ChatSessionTurnData) {

    // Debug
    const fnName = `${this.clName}.saveMessages()`

    // The two participants
    const chatParticipants = await
      this.getParticipants(
        store,
        chatSession.id)

    // The user's message
    const userChatMessage = await
      this.createChatMessage(
        store,
        chatSession.id,
        chatParticipants.user.id,
        chatParticipants.agent.id,
        false,
        joinContents(sessionTurnData.fromContents))

    // The agent's reply
    const aiReplyChatMessage = await
      this.createChatMessage(
        store,
        chatSession.id,
        chatParticipants.agent.id,
        chatParticipants.user.id,
        true,
        joinContents(sessionTurnData.toContents))

    // Return
    return {
      status: true,
      userChatMessage: userChatMessage,
      aiReplyChatMessage: aiReplyChatMessage
    }
  }

  async getParticipants(
          store: ProjectStore,
          chatSessionId: string): Promise<ChatParticipants> {

    // Debug
    const fnName = `${this.clName}.getParticipants()`

    // Query
    const chatParticipants = await
      store.chatParticipants.findMany({
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

      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `the session needs a user and an agent participant`
      })
    }

    // Return
    return {
      user: user,
      agent: agent
    }
  }

  async createChatMessage(
          store: ProjectStore,
          chatSessionId: string,
          fromChatParticipantId: string,
          toChatParticipantId: string,
          sentByAi: boolean,
          message: string): Promise<ChatMessageRecord> {

    // Debug
    const fnName = `${this.clName}.createChatMessage()`

    // The message is created and last changed at the same moment
    const created = new Date().toISOString()

    // Create record
    return await store.chatMessages.create({
      data: {
        id: createId(),
        chatSessionId: chatSessionId,
        fromChatParticipantId: fromChatParticipantId,
        toChatParticipantId: toChatParticipantId,
        externalId: null,
        sentByAi: sentByAi,
        message: message,
        created: created,
        updated: created
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
