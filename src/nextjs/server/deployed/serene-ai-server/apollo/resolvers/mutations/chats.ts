import { prisma } from '@/db'
import { CustomError } from '@/serene-core-server/types/errors'
import { ChatSessionService } from '../../../services/chats/sessions/chat-session-service'


// Services
const chatSessionService = new ChatSessionService()


// Code
export async function getOrCreateChatSession(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  const fnName = `getOrCreateChatSession()`

  // console.log(`${fnName}: args: ${JSON.stringify(args)}`)

  var results: any

  await prisma.$transaction(async (transactionPrisma: any) => {

    try {
      results = await
        chatSessionService.getOrCreateChatSession(
          transactionPrisma,
          args.chatSessionId,
          null,       // baseChatSettingsId
          args.userProfileId,
          args.instanceId,
          true,       // encryptedAtRest
          false,      // jsonMode
          args.prompt,
          null,       // appCustom
          null)       // name
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

  console.log(`${fnName}: results: ${JSON.stringify(results)}`)

  return results
}
