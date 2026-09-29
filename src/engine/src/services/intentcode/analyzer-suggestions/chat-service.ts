import { input } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ChatMessage } from '@/types/ai-types.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { AnalyzerChatParams, ChatSessionOptions, ChatTypes, getAnalyzerSuggestion } from '@/types/chat-types.js'
import { ProjectDetails } from '@/types/server-only-types.js'
import { InstanceChatsService } from '@/services/instance-chats/common/service.js'
import { ChatSessionTurnService } from '@/services/instance-chats/chat-session-turn.js'
import { TuiService } from '@/services/utils/tui-service.js'

// Services
const chatSessionTurnService = new ChatSessionTurnService()
const instanceChatsService = new InstanceChatsService()
const tuiService = new TuiService()

// Class
export class IntentCodeAnalyzerSuggestionsChatService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsChatService'

  escAddCommand = '/a'
  escIgnoreCommand = '/i'

  // Code
  async createChatSession(
    store: ProjectStore,
    projectDetails: ProjectDetails,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestion: any) {

    // Debug
    const fnName = `${this.clName}.createChatSession()`

    // Prep vars
    const chatSessionId: string | undefined = undefined

    const chatSessionOptions: ChatSessionOptions = {
      chatType: ChatTypes.analyzerSuggestions
    }

    // Define params as appCustom
    const appCustom: AnalyzerChatParams = {
      projectNode: projectDetails?.projectNode,
      buildData: buildData,
      buildFromFiles: buildFromFiles,
      suggestion: suggestion
    }

    // Get/create a chat session
    const results = await
      instanceChatsService.getOrCreateChatSession(
        store,
        projectDetails.project.id,
        chatSessionId,
        BaseDataTypes.coderChatSettingsName,  // chatSettingsName
        JSON.stringify(appCustom),
        chatSessionOptions)

    // Validate
    if (results.status === false) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `results.status === false`
      })
    }

    // Return
    return results
  }

  async openChat(
    store: ProjectStore,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestion: any) {

    // Debug
    const fnName = `${this.clName}.openChat()`

    // Track the potentially updated suggestion separately
    var thisSuggestion = suggestion

    // Get ProjectDetails
    const projectDetails = buildData.projects[suggestion.projectNo]

    // Debug
    // console.log(`${fnName}: projectDetails: ` + JSON.stringify(projectDetails))

    // Validate
    if (projectDetails == null) {
      throw new IntentError({
        category: 'ChatError',
        stage: fnName,
        message: `projectDetails == null`
      })
    }

    // Create chat session
    const { chatSession } = await
      this.createChatSession(
        store,
        projectDetails,
        buildData,
        buildFromFiles,
        suggestion)


    // Chat loop
    while (true) {

      // Prompt for input
      console.log(``)

      var userInput = await
        input({
          message:
            `Chat.. or /a (add to approved list) /i (ignore this suggestion)`
        })

      userInput = userInput.trim()

      // Handle menu selections
      if (userInput === this.escAddCommand) {

        // Update the suggestion
        suggestion = thisSuggestion

        // Return add to approved list
        return {
          addToApprovedList: true
        }

      } else if (userInput === this.escIgnoreCommand) {

        // Return with ignore
        return {
          addToApprovedList: false
        }
      }

      // Convert the input to the expected format
      const contents: ChatMessage[] = [
        {
          type: 'md',
          text: userInput
        }
      ]

      // Get the AI's reply
      const replyData = await
        chatSessionTurnService.turn(
          store,
          chatSession.id,
          contents)

      // Debug
      // console.log(`${fnName}: replyData: ` + JSON.stringify(replyData))

      // Display the response
      if (replyData.contents != null) {

        for (const message of replyData.contents) {

          console.log(``)

          tuiService.renderMessageWithTitle(
            'Analyzer',
            message.text)
        }
      }

      const updatedSuggestion = getAnalyzerSuggestion(replyData.rawJson)

      if (updatedSuggestion != null) {

        console.log(``)
        console.log(`UPDATED: ${updatedSuggestion.text}`)

        for (const fileDelta of updatedSuggestion.fileDeltas) {
          console.log(`.. ${fileDelta.fileOp} ${fileDelta.relativePath}: ` +
            `${fileDelta.change}`)
        }
      }
    }
  }
}
