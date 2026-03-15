import { SereneAiCleanUpService } from 'serene-ai-server'
import { PrismaClient } from '@/prisma/client.js'

// Services
const sereneAiCleanUpService = new SereneAiCleanUpService()

// Class
export class HousekeepingDeleteService {

  // Consts
  clName = 'HousekeepingDeleteService'

  // Code
  async deleteOldRecords(prisma: PrismaClient) {

    // Delete old chat sessions and message stats
    await sereneAiCleanUpService.deleteOldChatSessions(
      prisma,
      30,  // chatSessionsDaysAgo
      90)  // chatMessageCreatedDaysAgo
  }
}
