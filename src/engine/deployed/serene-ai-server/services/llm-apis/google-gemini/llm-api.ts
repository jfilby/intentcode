import { GoogleGenAI } from '@google/genai'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { TechProviderApiKeyModel } from '@/serene-core-server/models/tech/tech-provider-api-key-model'
import { TechProviderModel } from '@/serene-core-server/models/tech/tech-provider-model'
import { FeatureFlags } from '../../../types/feature-flags'
import { SereneAiServerOnlyTypes } from '../../../types/server-only-types'
import { EstimateGeminiTokensService } from './estimate-tokens-service'

// Interfaces
interface ChatCompletion {
  messages: any[]
  inputTokens: number
  outputTokens: number
}

// Gemini clients
const geminiAiClients = new Map<string, GoogleGenAI>()

// Models
const techProviderModel = new TechProviderModel()
const techProviderApiKeyModel = new TechProviderApiKeyModel()

// Services
const estimateGeminiTokensService = new EstimateGeminiTokensService()

// Class
export class GoogleGeminiLlmService {

  // Consts
  clName = 'GoogleGeminiLlmService'

  // Code
  convertGeminiChatCompletionResults(
    completion: ChatCompletion,
    model: string,
    tech: any) {

    // Debug
    const fnName = `${this.clName}.convertGeminiChatCompletionResults()`

    // Return
    return {
      status: true,
      message: undefined,
      messages: completion.messages,
      model: model,
      actualTech: tech,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      // createdPgCacheEdge: undefined
    }
  }

  convertToGeminiInputMessages(messagesWithRoles: any[]) {

    // Debug
    const fnName = `${this.clName}.convertToGeminiInputMessages()`

    // console.log(`${fnName}: messagesWithRoles: ` +
    //             JSON.stringify(messagesWithRoles))

    // Convert messages
    var messages: any[] = []

    for (const message of messagesWithRoles) {

      // Get input text
      var text = ''

      for (const part of message.parts) {

        if (text.length > 0) {
          text += '\n'
        }

        if (part.text == null) {
          throw new CustomError(
                      `${fnName}: part.text == null from message: ` +
                      JSON.stringify(message))
        }

        text += part.text
      }

      // Add message
      messages.push({
        role: message.role,
        parts: [ { text: text } ]
      })
    }

    // Debug
    // console.log(`${fnName}: messages: ` +
    //             JSON.stringify(messages))

    // Return
    return messages
  }

  private async getChatCompletions(
                  prisma: PrismaClient,
                  tech: any,
                  model: string,
                  messagesWithRoles: any[],
                  jsonMode: boolean = false) {

    // Debug
    const fnName = `${this.clName}.getChatCompletions()`

    // console.log(`${fnName}: starting with messagesWithRoles: ` +
    //             JSON.stringify(messagesWithRoles))

    // console.log(`${fnName}: starting with model: ` + JSON.stringify(model))

    // Get/create the Gemini AI client
    const geminiAiClient = await
            this.getOrCreateClient(
              prisma,
              tech)

    // Validate
    if (geminiAiClient == null) {
      throw new CustomError(`${fnName}: geminiAiClient == null`)
    }

    // Convert to Gemini format
    messagesWithRoles = this.convertToGeminiInputMessages(messagesWithRoles)

    // Debug
    // console.log(`${fnName}: got messagesWithRoles`)

    // Get history: remove the latest message
    // Note: slice()'s end is exclusive of that index position
    const history = messagesWithRoles.slice(0, messagesWithRoles.length - 1)

    // Debug
    // console.log(`${fnName} history: ${JSON.stringify(history)}`)

    // Get the model
    const chat = geminiAiClient.chats.create({
      model: model,
      history: history,
      config: jsonMode ? {
        responseMimeType: 'application/json'
      } : undefined
    })

    // Get latest message
    const latestMsg =
            messagesWithRoles[messagesWithRoles.length - 1].parts[0].text

    // Verify latestMsg
    if (latestMsg == null) {
      throw new CustomError(`${fnName}: latestMsg == null`)
    }

    // Debug
    // console.log(`${fnName}: calling chat.sendMessage() with: ` +
    //             JSON.stringify(latestMsg))

    // Send message
    var response: any = undefined

    try {
      response = await
        chat.sendMessage({
          message: latestMsg
        })
    } catch(e) {
      console.error(`${fnName}: e: ` + JSON.stringify(e))

      if (response != null) {

        console.error(`${fnName}: statusCode: ` +
          JSON.stringify(response.statusCode))
      }
    }

    // Debug
    // console.log(`${fnName} response: ` + JSON.stringify(response))

    // Get text
    const text = response.text

    // Verify text
    if (text == null) {
      throw new CustomError(`${fnName}: text == null in response: ` +
                            JSON.stringify(response))
    }

    // Determine token usage
    var inputTokens: number = 0
    var outputTokens: number = 0

    if (response.usageMetadata != null) {

      inputTokens = response.usageMetadata.promptTokenCount!
      outputTokens = response.usageMetadata.candidatesTokenCount!

    } else {

      inputTokens =
        estimateGeminiTokensService.estimateInputTokens(messagesWithRoles)

      outputTokens = estimateGeminiTokensService.estimateOutputTokens([text])
    }

    // Return
    return {
      messages: [text],
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      statusCode: response ? response.statusCode : undefined
    }
  }

  async getOrCreateClient(
          prisma: PrismaClient,
          tech: any) {

    // Debug
    const fnName = `${this.clName}.getOrCreateClient()`

    // Validate the pricingTier
    if (tech.pricingTier == null) {
      throw new CustomError(
                  `${fnName}: pricingTier not set for Tech.id: ${tech.id}`)
    }

    // Define the cached client key by free/paid
    const clientKey = tech.pricingTier

    // Get by techProviderId
    if (geminiAiClients.has(clientKey)) {
      return geminiAiClients.get(clientKey)
    }

    // Get the TechProvider
    const techProvider = await
            techProviderModel.getById(
              prisma,
              tech.techProviderId)

    // Get an API key
    const techProviderApiKeys = await
            techProviderApiKeyModel.filter(
              prisma,
              techProvider.id,
              SereneCoreServerTypes.activeStatus,
              undefined,  // accountEmail
              tech.pricingTier)

    // Found at least one?
    if (techProviderApiKeys.length === 0) {
      throw new CustomError(`${fnName}: no API keys for ${techProvider.name}`)
    }

    // Create a new client
    const geminiAiClient =
            new GoogleGenAI({
              vertexai: false,
              apiKey: techProviderApiKeys[0].apiKey
          })

    // Save
    geminiAiClients.set(
      clientKey,
      geminiAiClient)

    // Return
    return geminiAiClient
  }

  async sendChatMessages(
          prisma: PrismaClient,
          tech: any,
          messagesWithRoles: any[],
          jsonMode: boolean = false) {

    // Debug
    const fnName = `${this.clName}.sendChatMessages()`

    console.log(`${fnName}: starting with variant: ${tech.variantName} ` +
                `model: ${tech.model}`)

    // Return early if external APIs not enabled
    if (FeatureFlags.externalApis === false) {
      console.warn(`${fnName}: external APIs not enabled, returning..`)
      return undefined
    }

    // Debug
    // console.log(`${fnName}: calling this.client.getChatCompletions ` +
    //             `with model: ${model} messagesWithRoles: ` +
    //             `${JSON.stringify(messagesWithRoles)}`)

    // ChatCompletion request
    //
    // Note: if this fails with no error then check the expected way to call
    //       the version of the NPM for this API.
    const completion = await
            this.getChatCompletions(
              prisma,
              tech,
              tech.model,
              messagesWithRoles,
              jsonMode)

    // Log
    // console.log(`${fnName}: completion: ${JSON.stringify(completion)}`)

    // Validate the results
    if (completion == null) {

      console.error(`${fnName}: Google Gemini call failed`)

      throw `Completion isn't set`
    }

    // Parse the results
    // TODO: is a special conversion function required? Maybe one that calls
    // convertOpenAiResults? Need inputTokens and outputTokens.
    const chatCompletionResults =
            this.convertGeminiChatCompletionResults(
              completion,
              tech.model,
              tech)

    // Cache the results

    // Return results
    return chatCompletionResults
  }
}
