import { IntentError } from '@/core/errors.js'
import type { ProjectStore } from '@/core/store.js'
import { ChatMessage } from '@/types/ai-types.js'
import { ChatService } from './chat-service.js'
import { ChatSessionService } from './chat-session-service.js'

// Contract
export interface ChatTurnResults {
  sentByAi: boolean
  chatSessionId: string
  aiReplyChatMessageId?: string
  contents: ChatMessage[]
  rawJson?: unknown
}

// Services
const chatService = new ChatService()
const chatSessionService = new ChatSessionService()

// Class
export class ChatSessionTurnService {

  // Consts
  clName = 'ChatSessionTurnService'

  // Code
  async turn(
          store: ProjectStore,
          chatSessionId: string,
          contents: ChatMessage[]): Promise<ChatTurnResults> {

    // Debug
    const fnName = `${this.clName}.turn()`

    // Process the turn up to 5 times
    var retryI = 0
    var replyData: ChatTurnResults | undefined = undefined

    while (retryI < 5 &&
           replyData == null) {

      try {

        replyData = await
          this.tryTurn(
            store,
            chatSessionId,
            contents)

      } catch (error) {

        if (error instanceof IntentError) {
          console.log(`${fnName}: error.message: ${error.message}`)
        } else {
          console.log(`${fnName}: error: ${error}`)
        }
      }

      retryI += 1
    }

    // Succeeded?
    if (replyData != null) {

      // Debug
      // console.log(`${fnName}: replyData: ` + JSON.stringify(replyData))

      // Return
      return replyData
    }

    // Failed (with retries)
    return {
      sentByAi: true,
      chatSessionId: chatSessionId,
      contents: [
        {
          type: '',
          text: 'Failed to process message, please retry or contact support.'
        }
      ]
    }
  }

  async tryTurn(
          store: ProjectStore,
          chatSessionId: string,
          contents: ChatMessage[]): Promise<ChatTurnResults> {

    // Debug
    const fnName = `${this.clName}.tryTurn()`

    // Debug
    // console.log(`${fnName}: starting..`)

    // Chat session turn
    const sessionTurnData = await
      chatService.runSessionTurn(
        store,
        chatSessionId,
        contents)

    // Save chat messages
    const saveMessageResults = await
      chatSessionService.saveMessages(
        store,
        sessionTurnData.chatSession,
        sessionTurnData)

    // Debug
    // console.log(`${fnName}: returning OK..`)

    // Return
    return {
      sentByAi: true,
      chatSessionId: chatSessionId,
      aiReplyChatMessageId: saveMessageResults.aiReplyChatMessage.id,
      contents: sessionTurnData.toContents,
      rawJson: sessionTurnData.toJson
    }
  }
}
