import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { RateLimitedApiModel } from '@/serene-core-server/models/tech/rate-limited-api-model'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { TechProviderModel } from '@/serene-core-server/models/tech/tech-provider-model'
import { AiTechDefs } from '../../types/tech-defs'
import { SereneAiServerOnlyTypes } from '../../types/server-only-types'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'

export class SereneAiSetup {

  // Consts
  clName = 'SereneAiSetup'

  // Models
  rateLimitedApiModel = new RateLimitedApiModel()
  techModel = new TechModel()
  techProviderModel = new TechProviderModel()
  // tipModel = new TipModel()

  // Code
  async upsertTech(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.upsertTech()`

    // Apollo.io API
    const apolloIoTechProvider = await
            this.techProviderModel.upsert(
              prisma,
              undefined,  // id
              SereneAiServerOnlyTypes.activeStatus,
              'Apollo.io',
              null)       // baseUrl

    const apolloIoApiTech = await
            this.techModel.upsert(
              prisma,
              undefined,  // id
              apolloIoTechProvider.id,
              SereneAiServerOnlyTypes.activeStatus,
              SereneAiServerOnlyTypes.apolloIoApi,
              SereneAiServerOnlyTypes.restApi,
              null,       // model
              SereneAiServerOnlyTypes.graphQlProtocol,
              SereneCoreServerTypes.free,
              true,       // isDefaultProvider
              false)      // isAdminOnly

    await this.rateLimitedApiModel.upsert(
            prisma,
            undefined,  // id
            apolloIoApiTech.id,
            1000000)

    // LLM tech providers (name -> TechProvider)
    var techProviders = new Map<string, any>()

    for (const llmTechProvider of AiTechDefs.llmTechProviders) {

      // Handle optional fields
      var baseUrl: string | null = null

      if (llmTechProvider.baseUrl) {
        baseUrl = llmTechProvider.baseUrl
      }

      // Upsert TechProvider
      const techProvider = await
              this.techProviderModel.upsert(
                prisma,
                undefined,  // id
                SereneAiServerOnlyTypes.activeStatus,
                llmTechProvider.name,
                baseUrl)

      // Set techProviders entry
      techProviders.set(
        llmTechProvider.name,
        techProvider)
    }

    // Upsert Tech records
    for (const llmTech of AiTechDefs.llmTechs) {

      // Get the TechProvider
      if (!techProviders.has(llmTech.provider)) {

        throw new CustomError(`${fnName}: techProvider not found for name: ` +
                              llmTech.provider)
      }

      const techProvider =
              techProviders.get(llmTech.provider)

      // Upsert Tech
      const tech = await
              this.techModel.upsert(
                prisma,
                undefined,  // id
                techProvider.id,
                SereneAiServerOnlyTypes.activeStatus,
                llmTech.variantName,
                llmTech.resource,
                llmTech.model,
                llmTech.protocol,
                llmTech.pricingTier,
                llmTech.default,
                llmTech.isAdminOnly)

      // Upsert rate-limits if defined
      if (llmTech.rateLimited) {

        await this.rateLimitedApiModel.upsert(
                prisma,
                undefined,    // id
                tech.id,
                llmTech.rateLimited?.perMinute!)
      }
    }
  }

  /* async upsertTips(prisma: PrismaClient) {

    // Worksheet intro tips
    await this.tipModel.upsert(
            prisma,
            undefined,  // id
            CommonTypes.sendChatMessageTipName,
            [CommonTypes.workbookTipTag])

    await this.tipModel.upsert(
            prisma,
            undefined,  // id
            CommonTypes.nextStageTipName,
            [CommonTypes.workbookTipTag])
  } */

  async setup(prisma: PrismaClient,
              userProfileId: string) {

    // Upsert data
    await this.upsertTech(prisma)
    // await this.upsertTips(prisma)

    // Return
    return {
      status: true
    }
  }
}
