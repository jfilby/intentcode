import { IntentError } from '@/core/errors.js'
import type { ChatSettingsRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ChatSessionOptions, ChatTypes } from '@/types/chat-types.js'
import { ChatPromptsService } from '../chat-prompts-service.js'
import { ChatSessionService } from '../chat-session-service.js'

// Services
const chatPromptsService = new ChatPromptsService()
const chatSessionService = new ChatSessionService()

// Class
export class InstanceChatsService {

  // Debug
  clName = 'InstanceChatsService'

  // Code

  // The chat settings a session is started with. They are seeded per project
  // at setup, so this is a lookup by name rather than a creation.
  async getInitialData(
    store: ProjectStore,
    chatSettingsName: string | undefined) {

    // Debug
    const fnName = `${this.clName}.getInitialData()`

    // Debug
    // console.log(`${fnName}: getting baseChatSettings with chatSettingsName: ` +
    //   JSON.stringify(chatSettingsName))

    // Get ChatSettings, but only if a name is specified
    var baseChatSettings: ChatSettingsRecord | null = null

    if (chatSettingsName != null) {

      // Debug
      // console.log(`${fnName}: getting ChatSettings by name..`)

      // Get ChatSettings
      baseChatSettings = await
        store.chatSettings.findFirst({
          where: {
            name: chatSettingsName
          }
        })

      // Debug
      // console.log(`${fnName}: baseChatSettings: ` +
      //   JSON.stringify(baseChatSettings))

      // Validate
      if (baseChatSettings == null) {

        throw new IntentError({
          category: 'ChatError',
          stage: fnName,
          message: `ChatSettings not found for name: ${chatSettingsName}`
        })
      }
    }

    // Debug
    // console.log(`${fnName}: returning..`)

    // Return
    return {
      baseChatSettings: baseChatSettings
    }
  }

  async getOrCreateChatSession(
    store: ProjectStore,
    projectId: string | null,
    chatSessionId: string | undefined,
    chatSettingsName: string | undefined,
    appCustom: string | undefined,
    options: ChatSessionOptions) {

    // Debug
    const fnName = `${this.clName}.getOrCreateChatSession()`

    /* console.log(`${fnName}: starting with projectId: ${projectId} ` +
      `chatSessionId: ${chatSessionId} ` +
      `chatSettingsName: ` + JSON.stringify(chatSettingsName)) */

    // Use the default ChatSettings name?
    if (chatSettingsName == null) {
      chatSettingsName = BaseDataTypes.defaultChatSettingsName
    }

    // Get initial data
    const initialDataResults = await
      this.getInitialData(
        store,
        chatSettingsName)

    var baseChatSettings = initialDataResults.baseChatSettings

    // Debug
    // console.log(`${fnName}: baseChatSettings: ` + JSON.stringify(baseChatSettings))

    // Get InstanceChat and related records
    if (chatSessionId != null) {

      const chatSessionResults = await
        chatSessionService.getChatSessionById(
          store,
          chatSessionId)

      // Validate
      if (chatSessionResults.status === false ||
          chatSessionResults.chatSession == null) {

        throw new IntentError({
          category: 'ChatError',
          stage: fnName,
          message: `chatSession not found: ${chatSessionId}`
        })
      }

      // Return
      return {
        status: true,
        chatSession: chatSessionResults.chatSession,
        chatParticipant: chatSessionResults.chatParticipant
      }
    }

    // Validate
    if (baseChatSettings == null) {

      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `ChatSettings not found for name: ${chatSettingsName}`
      })
    }

    // If an agent is specified then create a new ChatSettings record
    var chatSettings = baseChatSettings

    // Debug
    // console.log(`${fnName}: baseChatSettings: ` +
    //   JSON.stringify(baseChatSettings))

    // console.log(`${fnName}: creating chatSession..`)

    // Get the appCustom JSON
    var appCustomJson: any = null

    if (appCustom != null) {
      appCustomJson = JSON.parse(appCustom as string)
    }

    // Determine the prompt
    const prompt = await
      this.getPrompt(
        appCustomJson,
        chatSettings,
        options)

    // Determine the name of the chat session
    var name = ``

    // Debug
    // console.log(`${fnName}: creating ChatSession..`)

    // Create ChatSession
    const chatSessionResults = await
      chatSessionService.createChatSession(
        store,
        chatSettings.id,
        projectId,
        false,            // isEncryptedAtRest
        chatSettings.isJsonMode,
        prompt,
        appCustomJson,
        name)

    // Debug
    // console.log(`${fnName}: created chatSession: ` +
    //   JSON.stringify(chatSessionResults.chatSession))

    // Return
    return {
      status: true,
      chatSession: chatSessionResults.chatSession,
      chatParticipant: chatSessionResults.chatParticipant
    }
  }

  async getPrompt(
    appCustomJson: any,
    chatSettings: ChatSettingsRecord,
    options: ChatSessionOptions) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Get the prompt by the options
    if (options.chatType === ChatTypes.analyzerSuggestions) {

      // Validate
      if (chatSettings.isJsonMode === false) {

        const errorMessage =
          `${fnName}: expected chatSettings.isJsonMode to be true`

        console.error(errorMessage)
        throw new IntentError({
          category: 'ChatError',
          stage: fnName,
          message: errorMessage
        })
      }

      // Get and return Analysis page prompt
      const prompt = await
        chatPromptsService.getAnalyzerSuggestionsPrompt(
          appCustomJson)

      // Return
      return prompt
    }

    return null
  }
}
