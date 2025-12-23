import { PrismaClient } from '@prisma/client'
import { ApiUsageBaseService } from '@/serene-core-server/services/api-usage/api-usage-base-service'

export class ChatApiUsageService {

  // Consts
  clName = 'ChatApiUsageService'

  // Services
  apiUsageBaseService = new ApiUsageBaseService()

  // Code
  async isRateLimited(
          prisma: PrismaClient,
          techId: string) {

    // Debug
    const fnName = `${this.clName}.isRateLimited()`

    // Use the LLM techIdApollo.io API variant name
    return this.apiUsageBaseService.isRateLimited(
             prisma,
             undefined,  // variantName
             techId)
  }
}
