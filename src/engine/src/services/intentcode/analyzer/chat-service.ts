import { input, select } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { ChatMessage } from '@/types/ai-types.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { AnalyzerChatParams, ChatSessionOptions, ChatTypes, getAnalyzerSuggestion } from '@/types/chat-types.js'
import { ProjectDetails } from '@/types/server-only-types.js'
import { ChatSessionTurnService } from '@/services/instance-chats/chat-session-turn.js'
import { InstanceChatsService } from '@/services/instance-chats/common/service.js'
import { IntentCodeAnalyzerQueryService } from './query-service.js'
import { IntentCodeAnalyzerSuggestionsMutateService } from '../analyzer-suggestions/mutate-service.js'
import { TuiService } from '@/services/utils/tui-service.js'

// Services
const chatSessionTurnService = new ChatSessionTurnService()
const instanceChatsService = new InstanceChatsService()
const intentCodeAnalyzerQueryService = new IntentCodeAnalyzerQueryService()
const intentCodeAnalyzerSuggestionsMutateService = new IntentCodeAnalyzerSuggestionsMutateService()
const tuiService = new TuiService()

// Class
export class IntentCodeAnalyzerChatService {

  // Consts
  clName = 'IntentCodeAnalyzerChatService'

  approveCommand = 'approve'
  ignoreCommand = 'ignore'

  escBackCommand = '/b'

  // Code
  async createChatSession(
    store: ProjectStore,
    projectDetails: ProjectDetails,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[]) {

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
      suggestion: undefined
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
    project: ProjectRecord) {

    // Debug
    const fnName = `${this.clName}.openChat()`


    // Get build info
    var { buildData, buildFromFiles, projectDetails } = await
      intentCodeAnalyzerQueryService.getBuildInfo(
        store,
        project)

    // Create chat session
    const { chatSession } = await
      this.createChatSession(
        store,
        projectDetails,
        buildData,
        buildFromFiles)

    // Chat loop
    while (true) {

      // Prompt for input
      console.log(``)

      var userInput = await
        input({
          message: `Chat.. or /b (Back)`
        })

      userInput = userInput.trim()

      // Handle menu selections
      if (userInput === this.escBackCommand) {
        return
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

      // If a suggestion is listed
      const thisSuggestion = getAnalyzerSuggestion(replyData.rawJson)

      if (thisSuggestion != null) {

        console.log(``)
        console.log(`UPDATED: ${thisSuggestion.text}`)

        for (const fileDelta of thisSuggestion.fileDeltas) {

          console.log(`.. ${fileDelta.fileOp} ${fileDelta.relativePath}: ` +
            `${fileDelta.change}`)
        }

        // Prompt to apply or ignore the suggestion
        console.log(``)

        // Prompt
        const command = await select({
          message: `Select an option`,
          loop: false,
          pageSize: 10,
          choices: [
            {
              name: `Approve the suggestion`,
              value: this.approveCommand
            },
            {
              name: `Ignore`,
              value: this.ignoreCommand
            }
          ]
        })

        // Apply?
        if (command === this.approveCommand) {

          // Action the suggestion
          await intentCodeAnalyzerSuggestionsMutateService.approveSuggestions(
            store,
            buildData,
            buildFromFiles,
            [thisSuggestion]);

          // Get build info
          ({ buildData, buildFromFiles, projectDetails } = await
            intentCodeAnalyzerQueryService.getBuildInfo(
              store,
              project))
        }
      }
    }
  }
}
