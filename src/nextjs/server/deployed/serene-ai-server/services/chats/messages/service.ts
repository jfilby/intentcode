import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { ChatMessageCreatedModel } from '@/serene-core-server/models/chat/chat-message-created-model'
import { ChatMessageModel } from '@/serene-core-server/models/chat/chat-message-model'
import { AiTechPricing } from '../../../types/tech-pricing'

// Models
const chatMessageCreatedModel = new ChatMessageCreatedModel()
const chatMessageModel = new ChatMessageModel(process.env.NEXT_PUBLIC_DB_ENCRYPT_SECRET)

  // Class
export class ChatMessageService {

  // Consts
  clName = 'ChatMessageService'

  million1 = 1000000  // 1 million

  // Code
  calcCostInCents(
    tech: any,
    resource: string,
    inputTokens: number,
    outputTokens: number) {

    // Debug
    const fnName = `${this.clName}.calcCost()`

    // No cost if a free tier
    if (tech.pricingTier === SereneCoreServerTypes.free) {
      return 0.0
    }

    // Define pricing key
    const pricingKey = `${tech.variantName}/${tech.pricingTier}/${resource}`

    /* Debug
    console.log(`${fnName}: AiTechPricing.pricing: ` +
                JSON.stringify(AiTechPricing.pricing)) */

    // Validate
    if (!AiTechPricing.pricing.hasOwnProperty(pricingKey)) {

      const message = `${fnName}: pricing not found for key: ${pricingKey}`

      console.error(message)
      throw new CustomError(message)
    }

    // Get pricing
    const pricing = AiTechPricing.pricing[pricingKey]

    // Debug
    // console.log(`${fnName}: pricing: ` + JSON.stringify(pricing))

    // Calc cost
    var costInCents: number

    // Single price
    if (Array.isArray(pricing) === false) {

      costInCents =
        ((inputTokens * pricing.inputTokens) +
         (outputTokens * pricing.outputTokens)) / this.million1 * 100

    // Array of prices
    } else {

      const totalTokens = inputTokens + outputTokens

      // Find matching tier
      const tier = pricing.find(p =>
          (p.tokensLte != null && totalTokens <= p.tokensLte) ||
          (p.tokensGt != null && totalTokens > p.tokensGt)
        ) || pricing[pricing.length - 1]  // Fallback

      costInCents =
        ((inputTokens * tier.inputTokens) +
        (outputTokens * tier.outputTokens)) / this.million1 * 100
    }

    // Debug
    // console.log(`${fnName}: costInCents: ` + JSON.stringify(costInCents))

    // Return
    return costInCents
  }

  async getAllByChatSessionId(
          prisma: PrismaClient,
          chatSession: any) {

    return await chatMessageModel.getByChatSessionId(
                   prisma,
                   chatSession,
                   null)  // maxPrevMessages
  }

  async saveChatMessage(
          prisma: PrismaClient,
          chatSession: any,
          replyToId: string | null,
          fromUserProfileId: string,
          fromChatParticipantId: string,
          toChatParticipantId: string,
          externalId: string | null,
          sentByAi: boolean,
          message: string,
          tech: any,
          inputTokens: number | undefined,
          outputTokens: number | undefined) {

    // Debug
    const fnName = `${this.clName}.saveChatMessage()`

    // console.log(`${fnName}: inputTokens: ${inputTokens} outputTokens ` +
    //             `${outputTokens}`)

    // Create ChatMessage
    const chatMessage = await
            chatMessageModel.create(
              prisma,
              undefined,  // id
              chatSession,
              replyToId,
              fromUserProfileId,
              fromChatParticipantId,
              toChatParticipantId,
              externalId,
              sentByAi,
              message)

    // There are cases where the message is just for context, and was never
    // sent to an AI API. In these cases return early (don't create a
    // ChatMessageCreated record).
    if (tech == null) {
      return chatMessage
    }

    // Validate
    if (inputTokens == null ||
        outputTokens == null) {

      const message = `${fnName}: inputTokens or outputTokens not ` +
                      `specified, but tech was specified`

      console.error(message)
      throw new CustomError(message)
    }

    // Return
    return chatMessage
  }
}
