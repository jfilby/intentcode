import { ModelMessage } from 'ai'
import { CustomError } from 'serene-core-server'
import {
  AgentUser,
  ChatParticipant,
  ChatSession,
  PrismaClient,
  UserProfile
} from '@/prisma/client.js'
import { ChatMessage } from '@/types/ai-types.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'
import { LlmService } from '@/services/ai/llm-service.js'
import { ChatSessionService } from './chat-session-service.js'

// Contract
export interface RunSessionTurnResults {
  chatSession: ChatSession
  toChatParticipant: ChatParticipant
  toUserProfile: UserProfile
  agentUser: AgentUser
  fromContents: ChatMessage[]
  toContents: ChatMessage[]
  toJson: unknown
}

// Services
const chatSessionService = new ChatSessionService()
const llmService = new LlmService()

// Class
export class ChatService {

  // Consts
  clName = 'ChatService'

  // Code
  async runSessionTurn(
          prisma: PrismaClient,
          chatSessionId: string,
          fromChatParticipantId: string,
          fromUserProfile: UserProfile,
          fromContents: ChatMessage[]): Promise<RunSessionTurnResults> {

    // Debug
    const fnName = `${this.clName}.runSessionTurn()`

    // Get the session
    const chatSessionResults = await
      chatSessionService.getChatSessionById(
        prisma,
        chatSessionId,
        fromUserProfile.id)

    if (chatSessionResults.status === false) {
      throw new CustomError(`${fnName}: chatSession not found`)
    }

    const chatSession = chatSessionResults.chatSession!

    // Get the agent
    const agentUser = chatSession.chatSettings.agentUser

    if (agentUser == null) {
      throw new CustomError(`${fnName}: agentUser == null`)
    }

    // The agent participant
    const chatParticipants = await
      chatSessionService.getParticipants(
        prisma,
        chatSessionId)

    // Get the history
    const historyResults = await
      chatSessionService.getChatMessages(
        prisma,
        chatSessionId,
        agentUser.maxPrevMessages)

    // The messages, oldest first
    const messages: ModelMessage[] =
      historyResults.chatMessages.map((chatMessage) => ({
        role: chatMessage.sentByAi ? 'assistant' : 'user',
        content: chatMessage.message
      }))

    // The new user message
    messages.push({
      role: 'user',
      content: fromContents
        .map((content) => content.text)
        .join(`\n\n`)
    })

    // The system prompt: what the agent is, then what this session is about
    const system =
      [
        agentUser.defaultPrompt,
        agentUser.role,
        chatSession.chatSettings.prompt
      ]
        .filter((part) => part != null && part !== ``)
        .join(`\n\n`)

    // The model call
    const isJsonMode = chatSession.chatSettings.isJsonMode

    const results = await
      llmService.chat({
        aiTask: IntentCodeAiTasks.compiler,
        system: system,
        messages: messages,
        isJsonMode: isJsonMode
      })

    // The reply: the model's messages if it sent any, else its raw text
    const toContents = isJsonMode === true ?
      extractMessages(results.json) :
      []

    if (toContents.length === 0) {
      toContents.push({
        type: '',
        text: results.text
      })
    }

    // Return
    return {
      chatSession: chatSession,
      toChatParticipant: chatParticipants.agent,
      toUserProfile: fromUserProfile,
      agentUser: agentUser,
      fromContents: fromContents,
      toContents: toContents,
      toJson: results.json
    }
  }
}

// In JSON mode the model returns its rendered reply under 'messages'
function extractMessages(json: unknown): ChatMessage[] {

  // Validate
  if (json == null ||
      typeof json !== 'object' ||
      !('messages' in json)) {

    return []
  }

  const messages = json.messages

  if (Array.isArray(messages) === false) {
    return []
  }

  // Extract
  const contents: ChatMessage[] = []

  for (const message of messages) {

    if (message == null ||
        typeof message !== 'object' ||
        !('text' in message) ||
        typeof message.text !== 'string') {

      continue
    }

    contents.push({
      type: ('type' in message && typeof message.type === 'string') ?
        message.type :
        '',
      text: message.text
    })
  }

  // Return
  return contents
}
