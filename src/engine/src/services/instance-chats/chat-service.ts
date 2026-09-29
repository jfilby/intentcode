import { ModelMessage } from 'ai'
import { IntentError } from '@/core/errors.js'
import type {
  AgentUserRecord,
  ChatParticipantRecord,
  ChatSessionWithSettings
} from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { ChatMessage } from '@/types/ai-types.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'
import { LlmService } from '@/services/ai/llm-service.js'
import { ChatSessionService } from './chat-session-service.js'

// Contract
export interface RunSessionTurnResults {
  chatSession: ChatSessionWithSettings
  toChatParticipant: ChatParticipantRecord
  agentUser: AgentUserRecord
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
          store: ProjectStore,
          chatSessionId: string,
          fromContents: ChatMessage[]): Promise<RunSessionTurnResults> {

    // Debug
    const fnName = `${this.clName}.runSessionTurn()`

    // Get the session
    const chatSessionResults = await
      chatSessionService.getChatSessionById(
        store,
        chatSessionId)

    if (chatSessionResults.status === false) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `chatSession not found: ${chatSessionId}`
      })
    }

    const chatSession = chatSessionResults.chatSession!

    // Get the agent
    const agentUser = chatSession.agentUser

    if (agentUser == null) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `agentUser == null: ${chatSessionId}`
      })
    }

    // The settings framing the session
    const chatSettings = chatSession.chatSettings

    if (chatSettings == null) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `chatSettings == null: ${chatSessionId}`
      })
    }

    // The agent participant
    const chatParticipants = await
      chatSessionService.getParticipants(
        store,
        chatSessionId)

    // Get the history
    const historyResults = await
      chatSessionService.getChatMessages(
        store,
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
        chatSettings.prompt
      ]
        .filter((part) => part != null && part !== ``)
        .join(`\n\n`)

    // The model call
    const isJsonMode = chatSettings.isJsonMode

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
