import { UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { UserProfileModel } from '@/serene-core-server/models/users/user-profile-model'
import { ChatMessage } from '@/serene-ai-server/types/server-only-types'
import { AiTasksService } from '@/serene-ai-server/services/ai-tasks/ai-tasks-service'
import { ChatSessionService } from '@/serene-ai-server/services/chats/sessions/chat-session-service'
import { ChatService } from '@/serene-ai-server/services/llm-apis/chat-service'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types'

// Models
const userProfileModel = new UserProfileModel()

// Services
const aiTasksService = new AiTasksService()
const chatService = new ChatService()
const chatSessionService = new ChatSessionService()

// Class
export class ChatSessionTurnService {

  // Consts
  clName = 'ChatSessionTurnService'

  // Code
  async turn(prisma: any,
    chatSessionId: string,
    chatParticipantId: string,
    userProfileId: string,
    instanceId: string,
    name: string,
    contents: ChatMessage[]) {

    // Debug
    const fnName = `${this.clName}.turn()`

    // Get UserProfile
    const userProfile = await
      userProfileModel.getById(
        prisma,
        userProfileId)

    // Validate
    if (userProfile == null) {
      throw new CustomError(`${fnName}: userProfile == null`)
    }

    // Get tech
    const tech = await
      aiTasksService.getTech(
        prisma,
        ServerOnlyTypes.namespace,
        IntentCodeAiTasks.compiler,
        null,  // userProfileId
        true)  // exceptionOnNotFound

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null`)
    }

    // Process turn up to 5 times
    var retryI = 0
    var replyData: any = undefined

    while (retryI < 5 &&
           replyData == null) {

      try {
        await prisma.$transaction(async (transactionPrisma: any) => {

          replyData = await
            this.tryTurn(
              transactionPrisma,
              tech.id,
              chatSessionId,
              chatParticipantId,
              userProfile,
              instanceId,
              name,
              contents)
        },
        {
          maxWait: 5 * 60000, // default: 5m
          timeout: 5 * 60000, // default: 5m
        })

      } catch (error) {
        if (error instanceof CustomError) {

          console.log(`${fnName}: error.message: ${error.message}`)
        } else {
          console.log(`${fnName}: error.message: ${error}`)
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
    const sessionTurnData = await
      chatSessionService.getAgentInfo(
        prisma,
        chatSessionId)

    // Debug
    // console.log(`${fnName}: sessionTurnData: ` +
    //             JSON.stringify(sessionTurnData))

    // Validate
    if (sessionTurnData.agentUser == null) {
      throw new CustomError(`${fnName}: sessionTurnData.agentUser == null`)
    }

    // Return
    return {
      sentByAi: true,
      chatSessionId: chatSessionId,
      chatParticipantId: sessionTurnData.toChatParticipant.id,
      userProfileId: sessionTurnData.toUserProfile.id,
      name: sessionTurnData.agentUser.name,
      contents: [
        {
          type: '',
          text: 'Failed to process message, please retry or contact support.'
        },
      ],
      userChatMessage: undefined,
      aiReplyChatMessage: undefined,
      rawJson: undefined
    }
  }

  async tryTurn(
    prisma: any,
    llmTechId: string | undefined,
    chatSessionId: string,
    chatParticipantId: string,
    userProfile: UserProfile,
    instanceId: string,
    name: string,
    contents: ChatMessage[]) {

    // Debug
    const fnName = `${this.clName}.tryTurn()`

    // console.log(`${fnName}: starting..`)

    // Chat session turn
    const sessionTurnData = await
      chatService.runSessionTurn(
        prisma,
        llmTechId,
        chatSessionId,
        chatParticipantId,
        userProfile,
        name,
        contents)

    // Non-recoverable error message?
    if (sessionTurnData.status === false) {

      return {
        chatSessionId: chatSessionId,
        contents: [{
          type: 'error',
          text: sessionTurnData.message
        }]
      }
    }

    // Reply data var
    var replyData: any = null
    var saveMessageResults: any = null

    // Rate limited?
    if (sessionTurnData.isRateLimited === true) {

      replyData = {
        chatSessionId: chatSessionId,
        contents: [{
          type: 'error',
          text: `Please try again in ${sessionTurnData.waitSeconds}s (rate limited).`
        }]
      }
    } else {

      // Debug
      // console.log(`${fnName}: sessionTurnData: ` +
      //             JSON.stringify(sessionTurnData))

      // Get the messages (contents) from the JSON
      // Assume this format if JSON mode is true
      if (sessionTurnData.chatSession.chatSettings.isJsonMode === false) {

        // sessionTurnData.toContents = sessionTurnData.messages

      } else {
        sessionTurnData.toContents = sessionTurnData.toJson.messages

        for (const message of sessionTurnData.toContents) {
          message.type = ''
        }
      }

      // Prep messages for saving with JSON reply data to prevent referencing
      // old ids in future AI responses. Make a deep copy of sessionTurnData.
      var saveSessionTurnData = structuredClone(sessionTurnData)

      saveSessionTurnData.toContents.changeObjects = null
      saveSessionTurnData.toContents.queryResults = null

      // Save chat messages
      saveMessageResults = await
        chatSessionService.saveMessages(
          prisma,
          saveSessionTurnData.chatSession,
          saveSessionTurnData)
    }

    // Debug
    // console.log(`${fnName}: sessionTurnData.toContents: ` +
    //   JSON.stringify(sessionTurnData.toContents))

    // Formulate the replyData
    replyData = {
      sentByAi: true,
      chatSessionId: chatSessionId,
      chatParticipantId: sessionTurnData.toChatParticipantId,
      // userChatMessage: saveMessageResults.userChatMessage,
      aiReplyChatMessageId: saveMessageResults.aiReplyChatMessage.id,
      userProfileId: sessionTurnData.toUserProfileId,
      name: sessionTurnData.toName,
      contents: sessionTurnData.toContents,  // Should be a JSON array
      rawJson: sessionTurnData.toJson        // Raw JSON returned from the LLM
    }

    // Debug
    // console.log(`${fnName}: returning OK..`)

    // Return
    return replyData
  }
}
