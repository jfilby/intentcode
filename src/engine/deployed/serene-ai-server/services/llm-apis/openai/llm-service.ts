import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { TechProviderApiKeyModel } from '@/serene-core-server/models/tech/tech-provider-api-key-model'
import { TechProviderModel } from '@/serene-core-server/models/tech/tech-provider-model'
import { AiTechDefs } from '../../../types/tech-defs'
import { FeatureFlags } from '../../../types/feature-flags'
import { OpenAIGenericLlmService } from './llm-generic-service'

// OpenAI clients
const openAiClients = new Map<string, OpenAI>()

// Models
const techProviderModel = new TechProviderModel()
const techProviderApiKeyModel = new TechProviderApiKeyModel()

// Class
export class OpenAiLlmService {

  // Consts
  clName = 'OpenAiLlmService'

  openAiName = 'OpenAI'

  // Model names from: https://openai.com/pricing
  gpt3pt5Turbo = 'gpt-3.5-turbo'
  gpt4 = 'gpt-4'
  gpt4Turbo = 'gpt-4-1106-preview'

  // Models
  techModel = new TechModel()

  // Services
  openAIGenericLlmService = new OpenAIGenericLlmService()

  // Code
  async getOrCreateClient(
          prisma: PrismaClient,
          tech: any) {

    // Debug
    const fnName = `${this.clName}.getOrCreateClient()`

    // Get by techProviderId
    if (openAiClients.has(tech.techProviderId)) {
      return openAiClients.get(tech.techProviderId)
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
              undefined)  // pricingTier

    // Found at least one?
    if (techProviderApiKeys.length === 0) {
      throw new CustomError(`${fnName}: no API keys for ${techProvider.name}`)
    }

    // Create a new client
    const openAi = new OpenAI({
            apiKey: techProviderApiKeys[0].apiKey,
            baseURL: techProvider.baseUrl
          })

    // Save
    openAiClients.set(
      tech.techProviderId,
      openAi)

    // Return
    return openAi
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

    // Get/create OpenAI client
    const openAi = await
            this.getOrCreateClient(
              prisma,
              tech)

    // Validate
    if (openAi == null) {

      const message = `${fnName}: this.openAi == null`

      console.error(message)
      throw new CustomError(message)
    }

    // Ignore jsonMode?
    if (jsonMode === true &&
        AiTechDefs.variantNamesToIgnoreJsonMode.includes(tech.variantName)) {

      jsonMode = false
    }

    // console.log(`${fnName}: getting variant's model name: ${model}`)

    // Return early if external APIs not enabled
    if (FeatureFlags.externalApis === false) {
      console.warn(`${fnName}: external APIs not enabled, returning..`)
      return undefined
    }

    // Debug
    // console.log(`${fnName}: calling this.openAiApi.createChatCompletion ` +
    //             `with model: ${model} messagesWithRoles: ` +
    //             `${JSON.stringify(messagesWithRoles)}`)

    // Set Completions options
    var completionsOptions: any = {
          model: tech.model,
          messages: messagesWithRoles
        }

    if (jsonMode === true) {
      completionsOptions.response_format={ "type": "json_object" }
    }

    // ChatCompletion request
    //
    // Note: if this fails with no error then check the expected way to call
    //       the version of the NPM for this API.
    var completion: any = null

    await openAi.chat.completions.create(completionsOptions)
    .then((res: any) => {
      /* console.log(`${fnName}: got response:`)
      console.log(`${fnName}: ` + JSON.stringify(res))
      console.log(`${fnName}: got result choice 0 message content:`)

      if (res.choices != null) {
        if (res.choices.length > 0) {
          console.log(res.choices[0].message.content)
        }
      } */

      completion = res
    })
    .catch((error: any) => {

      const errorStr = JSON.stringify(error)
      console.error(`${fnName}: error: ${errorStr}`)

      console.log(`${fnName}: error: ${errorStr}`)

      if (error instanceof OpenAI.APIError) {

        console.log(`${fnName}: status: ${error.status}`)
        console.log(`${fnName}: name: ${error.name}`)
        console.log(`${fnName}: headers: ${JSON.stringify(error.headers)}`)

        throw new CustomError(`${fnName}: OpenAI API error: ${errorStr}`)
      } else {
        throw new CustomError(`${fnName}: error: ${errorStr}`)
      }
    })

    // Log
    // console.log(`${fnName}: completion: ${JSON.stringify(completion)}`)

    // Validate the results
    if (completion == null) {

      const message = `${fnName}: OpenAI call failed: completion == null`
      console.error(message)
      throw new CustomError(message)
    }

    // Parse the results
    // TODO: is a special conversion function required? Maybe one that calls
    // convertOpenAiResults? Need inputTokens and outputTokens.
    const chatCompletionResults =
            this.openAIGenericLlmService.convertOpenAiChatCompletionResults(
              completion)

    // Cache the results

    // Return results
    return chatCompletionResults
  }
}
