import { CustomError, UsersService } from 'serene-core-server'
import { input } from '@inquirer/prompts'
import { PrismaClient } from '@/prisma/client.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ChatMessage } from '@/types/ai-types.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { AnalyzerChatParams, ChatSessionOptions, ChatTypes, getAnalyzerSuggestion } from '@/types/chat-types.js'
import { ProjectDetails } from '@/types/server-only-types.js'
import { ServerTestTypes } from '@/types/server-test-types.js'
import { InstanceChatsService } from '@/services/instance-chats/common/service.js'
import { ChatSessionTurnService } from '@/services/instance-chats/chat-session-turn.js'
import { TuiService } from '@/services/utils/tui-service.js'

// Services
const chatSessionTurnService = new ChatSessionTurnService()
const instanceChatsService = new InstanceChatsService()
const tuiService = new TuiService()
const usersService = new UsersService()

// Class
export class IntentCodeAnalyzerSuggestionsChatService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsChatService'

  escAddCommand = '/a'
  escIgnoreCommand = '/i'

  // Code
  async createChatSession(
    prisma: PrismaClient,
    userProfileId: string,
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
        prisma,
        projectDetails.instance.id,
        userProfileId,
        chatSessionId,
        BaseDataTypes.coderChatSettingsName,  // chatSettingsName
        JSON.stringify(appCustom),
        chatSessionOptions)

    // Validate
    if (results.status === false) {
      throw new CustomError(`${fnName}: results.status === false`)
    }

    // Return
    return results
  }

  async openChat(
    prisma: PrismaClient,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestion: any) {

    // Debug
    const fnName = `${this.clName}.openChat()`

    // Track the potentially updated suggestion separately
    var thisSuggestion = suggestion

    // Get/create an admin user
    const adminUserProfile = await
      usersService.getOrCreateUserByEmail(
        prisma,
        ServerTestTypes.adminUserEmail,
        undefined)  // defaultUserPreferences

    // Get ProjectDetails
    const projectDetails = buildData.projects[suggestion.projectNo]

    // Debug
    // console.log(`${fnName}: projectDetails: ` + JSON.stringify(projectDetails))

    // Validate
    if (projectDetails == null) {
      throw new CustomError(`${fnName}: projectDetails == null`)
    }

    // Create chat session
    const { chatSession, chatParticipant } = await
      this.createChatSession(
        prisma,
        adminUserProfile.id,
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
          prisma,
          chatSession.id,
          chatParticipant.id,
          adminUserProfile,
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
