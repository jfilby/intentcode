import { Instance, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { consoleService } from '@/serene-core-server/services/console/service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { ChatMessage } from '@/serene-ai-server/types/server-only-types'
import { BaseDataTypes } from '@/types/base-data-types'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { AnalyzerChatParams, ChatSessionOptions, ChatTypes } from '@/types/chat-types'
import { ProjectDetails } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { BuildMutateService } from '../build/mutate-service'
import { ChatSessionTurnService } from '@/services/instance-chats/chat-session-turn'
import { InstanceChatsService } from '@/services/instance-chats/common/service'
import { ProjectsQueryService } from '@/services/projects/query-service'
import { ProjectCompileService } from '@/services/projects/compile-service'

// Services
const buildMutateService = new BuildMutateService()
const chatSessionTurnService = new ChatSessionTurnService()
const instanceChatsService = new InstanceChatsService()
const projectsQueryService = new ProjectsQueryService()
const projectCompileService = new ProjectCompileService()
const usersService = new UsersService()

// Class
export class IntentCodeAnalyzerChatService {

  // Consts
  clName = 'IntentCodeAnalyzerChatService'

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

    // Init BuildData
    const buildData = await
      buildMutateService.initBuildData(
        prisma,
        instance.id)

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByInstanceId(
        instance.id,
        buildData.projects)

    // Debug
    // console.log(`${fnName}: projectDetails: ` + JSON.stringify(projectDetails))

    // Validate
    if (projectDetails == null) {
      throw new CustomError(`${fnName}: projectDetails == null`)
    }

    // Get buildFromFiles
    const buildFromFiles = await
      projectCompileService.getBuildFromFiles(projectDetails)

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
      console.log(`Chat.. or [b] Back`)

      var input = await
        consoleService.askQuestion('> ')

      input = input.trim()

      // Handle menu selections
      if (input === 'b') {
        return
      }

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
          console.log(`AI> ${message.text}`)
        }
      }

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
      }
    }
  }
}
