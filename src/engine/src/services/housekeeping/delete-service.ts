import { PrismaClient } from '@/prisma/client.js'

// Class
export class HousekeepingDeleteService {

  // Consts
  clName = 'HousekeepingDeleteService'

  // Code
  async deleteOldRecords(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.deleteOldRecords()`

    // The cutoffs
    const chatSessionsDaysAgo = 30
    const chatMessageCreatedDaysAgo = 90

    const chatSessionsCutoff =
      new Date(Date.now() - chatSessionsDaysAgo * 24 * 60 * 60 * 1000)

    const chatMessageCreatedCutoff =
      new Date(Date.now() - chatMessageCreatedDaysAgo * 24 * 60 * 60 * 1000)

    // Delete the messages of old chat sessions first (participants and
    // sessions reference them)
    await prisma.chatMessage.deleteMany({
      where: {
        chatSession: {
          created: {
            lt: chatSessionsCutoff
          }
        }
      }
    })

    await prisma.chatParticipant.deleteMany({
      where: {
        chatSession: {
          created: {
            lt: chatSessionsCutoff
          }
        }
      }
    })

    await prisma.chatSession.deleteMany({
      where: {
        created: {
          lt: chatSessionsCutoff
        }
      }
    })

    // Delete the per-message usage records
    await prisma.chatMessageCreated.deleteMany({
      where: {
        created: {
          lt: chatMessageCreatedCutoff
        }
      }
    })
  }
}
