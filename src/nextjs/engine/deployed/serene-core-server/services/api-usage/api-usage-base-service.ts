import { PrismaClient } from '@prisma/client'
import { CustomError } from '../../types/errors'
import { TechModel } from '../../models/tech/tech-model'
import { RateLimitedApiModel } from '../../models/tech/rate-limited-api-model'
import { RateLimitedApiEventModel } from '../../models/tech/rate-limited-api-event-model'

export class ApiUsageBaseService {

  // Consts
  clName = 'ApiUsageBaseService'

  // Models
  rateLimitedApiEventModel = new RateLimitedApiEventModel()
  rateLimitedApiModel = new RateLimitedApiModel()
  techModel = new TechModel()

  // Code
  async isRateLimited(
          prisma: PrismaClient,
          variantName: string | undefined = undefined,
          techId: string | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.isRateLimited()`

    // Validate
    if (techId == null &&
        variantName == null) {

      throw new CustomError(`Either a techId or variantName must be specified`)
    }

    // Get the techId for the Apollo.io API
    if (techId == null &&
        variantName != null) {

      const tech = await
              this.techModel.getByVariantName(
                prisma,
                variantName)

      techId = tech.id
    }

    if (techId == null) {
      throw new CustomError(`techId not found`)
    }

    // Get API rate limiting data
    const rateLimitedApi = await
            this.rateLimitedApiModel.getByTechId(
              prisma,
              techId)

    // Return null if not a rate-limited tech
    if (rateLimitedApi == null) {
      return null
    }

    // Determine if rate-limited
    const eventCount = await
            this.rateLimitedApiEventModel.getUserSentForLastSpecifiedMinutes(
              prisma,
              1)  // For the last minute

    console.log(`${fnName}: is eventCount: ${eventCount} >= ` +
                `rateLimitedApi.ratePerMinute: ${rateLimitedApi.ratePerMinute}`)

    // Is the API currently rate limited?
    var isRateLimited = false
    var waitSeconds: number | null = 0

    if (eventCount >= rateLimitedApi.ratePerMinute) {
      isRateLimited = true

      // Get last record within the window
      waitSeconds = await
        this.rateLimitedApiEventModel.getWaitSecondsSinceLastSpecifiedMinutes(
          prisma,
          1)  // For the last minute

      if (waitSeconds == null ||
          waitSeconds === 0) {

        isRateLimited = false
      }
    }

    return {
      isRateLimited: isRateLimited,
      waitSeconds: waitSeconds,
      rateLimitedApiId: rateLimitedApi.id
    }
  }
}
