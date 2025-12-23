import { PrismaClient } from '@prisma/client'
import { ChatSessionModel } from '@/serene-core-server/models/chat/chat-session-model'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'

export class SereneAiCleanUpService {

  // Consts
  clName = 'SereneAiCleanUpService'

  // Models
  chatSessionModel = new ChatSessionModel()
  chatSettingsModel = new ChatSettingsModel()

  // Code
  async getChatSessionsToPurge(prisma: PrismaClient) {

    // Get old chats that never started.
    // Separate from run(), which deletes them, as an app that uses this
    // package might need to delete related records first.
    const chatSessions = await
            this.chatSessionModel.getNewStatusOver3DaysOld(prisma)

    return chatSessions
  }

  async run(prisma: PrismaClient,
            purgeChatSessions: any[]) {

    // Debug
    const fnName = `${this.clName}.run()`

    await prisma.$transaction(async (transactionPrisma: any) => {

      for (const chatSession of purgeChatSessions) {

        console.log(`${fnName}: deleting ChatSession: ` + chatSession.id)

        await this.chatSessionModel.deleteByIdCascade(
                transactionPrisma,
                chatSession.id)
      }
    },
    {
      maxWait: 5 * 60000, // default: 5m
      timeout: 5 * 60000, // default: 5m
    })

    // Delete unused ChatSettings records
    console.log(`${fnName}: deleting unused ChatSettings...`)

    const unusedChatSettings = await
            this.chatSettingsModel.getUnused(prisma)

    for (const unusedChatSetting of unusedChatSettings) {

      await this.chatSettingsModel.deleteById(
              prisma,
              unusedChatSetting.id)
    }
  }
}
