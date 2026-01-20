import { prisma } from '@/db'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
// import { CreateChatSessionService } from '@/services/chats/create-chat-service'
// import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
// const createChatSessionService = new CreateChatSessionService()
// const projectsQueryService = new ProjectsQueryService()
const usersService = new UsersService()

// Code
export async function loadServerStartData(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // Debug
  const fnName = `loadServerStartData()`

  console.log(`${fnName}: args: ` + JSON.stringify(args))

  // Get user
  const user = await
          usersService.getUserByUserProfileId(
            prisma,
            args.userProfileId)

  /* Load instance
  var instance: any = null

  if (args.instanceId != null) {

    var instanceResults: any = null

    try {
      instanceResults = await
        projectsQueryService.getInstanceById(
          prisma,
          args.instanceId,
          args.userProfileId,
          true,   // includeParent
          true,   // includeInstanceRefs
          false,  // includeStats
          true)   // verifyAccess
    } catch (error) {
      if (error instanceof CustomError) {
        return {
          status: false,
          message: error.message
        }
      } else {
        return {
          status: false,
          message: `Unexpected error: ${error}`
        }
      }
    }

    if (instanceResults.status === false) {
      return instanceResults
    }

    // Set instance
    instance = instanceResults.instance
  }

  // Load chat session
  var chatSession: any = undefined

  if (args.loadChatSession === true &&
      (args.chatSessionId != null ||
       args.chatSettingsName != null)) {

    // Debug
    console.log(`${fnName}: loading chat session..`)

    // Load chat session
    var chatSessionResults: any = null

    await prisma.$transaction(async (transactionPrisma: any) => {

      try {
        chatSessionResults = await
          createChatSessionService.getOrCreateChatSession(
            transactionPrisma,
            args.instanceId,
            args.userProfileId,
            args.chatSessionId,
            null,  // externalIntegration
            null,  // externalId
            args.chatSettingsName,
            args.agentId,
            args.graphId,
            null)  // chatSessionOptions
      } catch (error) {
        if (error instanceof CustomError) {
          return {
            status: false,
            message: error.message
          }
        } else {
          return {
            status: false,
            message: `Unexpected error: ${error}`
          }
        }
      }
    })

    // Debug
    console.log(`${fnName}: chatSessionResults: ` +
                JSON.stringify(chatSessionResults))

    // Handle chatSessionResults
    if (chatSessionResults.status === false) {
      return chatSessionResults
    }

    chatSession = chatSessionResults.chatSession
  }

  // Debug
  console.log(`${fnName}: returning OK..`) */

  // Return
  return {
    status: true,
    // instance: instance,
    // chatSession: chatSession
  }
}
