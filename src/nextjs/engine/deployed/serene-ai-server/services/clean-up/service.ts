import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { ChatMessageCreatedModel } from '@/serene-core-server/models/chat/chat-message-created-model'
import { ChatSessionModel } from '@/serene-core-server/models/chat/chat-session-model'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'

// Models
const chatMessageCreatedModel = new ChatMessageCreatedModel()
const chatSessionModel = new ChatSessionModel()
const chatSettingsModel = new ChatSettingsModel()

// Service
export class SereneAiCleanUpService {

  // Consts
  clName = 'SereneAiCleanUpService'

  // Code
  async deleteOldChatSessions(
    prisma: PrismaClient,
    chatSessionsDaysAgo: number = 3,
    chatMessageCreatedDaysAgo: number | undefined) {

    // Debug
    const fnName = `${this.clName}.getOldChatSessions()`

    // Get ChatSessions
    const chatSessions = await
      chatSessionModel.getByDaysAgo(
        prisma,
        chatSessionsDaysAgo)

    // Validate
    if (chatSessions == null) {
      throw new CustomError(`${fnName}: chatSessions == null`)
    }

    // Delete old sessions
    await this.run(
      prisma,
      chatSessions)

    // Delete old ChatMessageCreated records
    if (chatMessageCreatedDaysAgo != null) {

      await chatMessageCreatedModel.deleteByDaysAgo(
        prisma,
        chatMessageCreatedDaysAgo)
    }
  }

  async getUnusedChatSessionsToPurge(prisma: PrismaClient) {

    // Get old chats that never started.
    // Separate from run(), which deletes them, as an app that uses this
    // package might need to delete related records first.
    const chatSessions = await
      chatSessionModel.getByDaysAgo(
        prisma,
        3,
        SereneCoreServerTypes.newStatus)

    return chatSessions
  }

  async run(
    prisma: PrismaClient,
    purgeChatSessions: any[]) {

    // Debug
    const fnName = `${this.clName}.run()`

    await prisma.$transaction(async (transactionPrisma: any) => {

      for (const chatSession of purgeChatSessions) {

        // console.log(`${fnName}: deleting ChatSession: ` + chatSession.id)

        await chatSessionModel.deleteByIdCascade(
          transactionPrisma,
          chatSession.id)
      }
    },
      {
        maxWait: 5 * 60000, // default: 5m
        timeout: 5 * 60000, // default: 5m
      })

    // Delete unused ChatSettings records
    // console.log(`${fnName}: deleting unused ChatSettings...`)

    const unusedChatSettings = await
      chatSettingsModel.getUnused(prisma)

    for (const unusedChatSetting of unusedChatSettings) {

      await chatSettingsModel.deleteById(
        prisma,
        unusedChatSetting.id)
    }
  }
}
