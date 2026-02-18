import { input, select } from '@inquirer/prompts'
import { Instance, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
import { ChatMessage } from '@/serene-ai-server/types/server-only-types'
import { BaseDataTypes } from '@/types/base-data-types'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { AnalyzerChatParams, ChatSessionOptions, ChatTypes } from '@/types/chat-types'
import { ProjectDetails } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { ChatSessionTurnService } from '@/services/instance-chats/chat-session-turn'
import { InstanceChatsService } from '@/services/instance-chats/common/service'
import { IntentCodeAnalyzerQueryService } from './query-service'
import { IntentCodeAnalyzerSuggestionsMutateService } from '../analyzer-suggestions/mutate-service'
import { TuiService } from '@/services/utils/tui-service'

// Services
const chatSessionTurnService = new ChatSessionTurnService()
const instanceChatsService = new InstanceChatsService()
const intentCodeAnalyzerQueryService = new IntentCodeAnalyzerQueryService()
const intentCodeAnalyzerSuggestionsMutateService = new IntentCodeAnalyzerSuggestionsMutateService()
const tuiService = new TuiService()
const usersService = new UsersService()

// Class
export class IntentCodeAnalyzerChatService {

  // Consts
  clName = 'IntentCodeAnalyzerChatService'

  approveCommand = 'approve'
  ignoreCommand = 'ignore'

  escBackCommand = '/b'

  // Code
  async createChatSession(
    prisma: PrismaClient,
    userProfileId: string,
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
    return results.chatSession
  }

  async openChat(
    prisma: PrismaClient,
    instance: Instance) {

    // Debug
    const fnName = `${this.clName}.openChat()`

    // Get/create an admin user
    const adminUserProfile = await
      usersService.getOrCreateUserByEmail(
        prisma,
        ServerTestTypes.adminUserEmail,
        undefined)  // defaultUserPreferences

    // Get build info
    var { buildData, buildFromFiles, projectDetails } = await
      intentCodeAnalyzerQueryService.getBuildInfo(
        prisma,
        instance)

    // Create chat session
    const chatSession = await
      this.createChatSession(
        prisma,
        adminUserProfile.id,
        projectDetails,
        buildData,
        buildFromFiles)

    // Get chatParticipantId
    // console.log(`${fnName}: chatSession: ` + JSON.stringify(chatSession))

    var chatParticipant: any = undefined

    for (const thisChatParticipant of chatSession.chatParticipants) {

      if (thisChatParticipant.userProfileId === adminUserProfile.id) {
        chatParticipant = thisChatParticipant
      }
    }

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
          prisma,
          chatSession.id,
          chatParticipant.id,
          adminUserProfile.id,
          projectDetails.instance.id,
          'User',  // name
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
      if (replyData.rawJson.suggestion != null) {

        const thisSuggestion = replyData.rawJson.suggestion

        console.log(``)
        console.log(`UPDATED: ${thisSuggestion.text}`)

        if (thisSuggestion.fileDeltas != null) {

          for (const fileDelta of thisSuggestion.fileDeltas) {

            console.log(`.. ${fileDelta.fileOp} ${fileDelta.relativePath}: ` +
              `${fileDelta.change}`)
          }
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
            prisma,
            buildData,
            buildFromFiles,
            [replyData.rawJson.suggestion]);

          // Get build info
          ({ buildData, buildFromFiles, projectDetails } = await
            intentCodeAnalyzerQueryService.getBuildInfo(
              prisma,
              instance))
        }
      }
    }
  }
}
