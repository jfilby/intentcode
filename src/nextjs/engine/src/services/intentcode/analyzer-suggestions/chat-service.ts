import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { ChatMessage } from '@/serene-ai-server/types/server-only-types'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { AnalyzerChatParams, ChatSessionOptions, ChatTypes } from '@/types/chat-types'
import { ProjectDetails } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { InstanceChatsService } from '@/services/instance-chats/common/service'
import { ChatSessionTurnService } from '@/services/instance-chats/chat-session-turn'

// Services
const chatSessionTurnService = new ChatSessionTurnService()
const consoleService = new ConsoleService()
const instanceChatsService = new InstanceChatsService()
const usersService = new UsersService()

// Class
export class IntentCodeAnalyzerSuggestionsChatService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsChatService'

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
    return results.chatSession
  }

  async openChat(
    prisma: PrismaClient,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestion: any) {

    // Debug
    const fnName = `${this.clName}.openChat()`

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
    const chatSession = await
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

      const input = await
        consoleService.askQuestion('> ')

      // Convert the input to the expected format
      const contents: ChatMessage[] = [
        {
          type: 'md',
          text: input
        }
      ]

      // Get the AI's reply
      const replyData = await
        chatSessionTurnService.turn(
          prisma,
          chatSession.id,
          chatSession.chatParticipantId,
          adminUserProfile.id,
          projectDetails.instance.id,
          'User',  // name
          contents)

      // Display the response

      if (replyData.contents != null) {

        for (const content of replyData.contents) {

          console.log(``)
          console.log(`AI> ${content.text}`)
        }

      } else {
        console.log(``)
        console.log(`AI> An error was encountered`)
      }
    }
  }
}
