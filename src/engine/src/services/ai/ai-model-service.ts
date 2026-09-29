import { createOpenAI } from '@ai-sdk/openai'
import { LanguageModel } from 'ai'
import { CustomError } from 'serene-core-server'
import { AiModelConfig } from '@/types/ai-types.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'

// Consts
const baseUrlEnvName = 'INTENTCODE_AI_BASE_URL'
const apiKeyEnvName = 'INTENTCODE_AI_API_KEY'
const modelEnvName = 'INTENTCODE_AI_MODEL'
const perTaskModelEnvPrefix = 'INTENTCODE_AI_'

// Class
export class AiModelService {

  // Consts
  clName = 'AiModelService'

  // Code

  // The model id for an AI task. A per-task variable (e.g.
  // INTENTCODE_AI_COMPILER_MODEL) wins over the shared one, so the compiler
  // and the indexer can run on different models.
  getModelId(aiTask: IntentCodeAiTasks) {

    // Debug
    const fnName = `${this.clName}.getModelId()`

    // A per-task model id
    const perTaskModelEnvName =
      `${perTaskModelEnvPrefix}${aiTask.toUpperCase()}_MODEL`

    const perTaskModelId = process.env[perTaskModelEnvName]

    if (perTaskModelId != null &&
        perTaskModelId !== ``) {

      return perTaskModelId
    }

    // The shared model id
    const modelId = process.env[modelEnvName]

    if (modelId == null ||
        modelId === ``) {

      throw new CustomError(`${fnName}: ${modelEnvName} is not set. Set it ` +
        `to the model id to use, e.g. 'gemini-3.1-pro-preview'.`)
    }

    // Return
    return modelId
  }

  getConfig(aiTask: IntentCodeAiTasks): AiModelConfig {

    // Debug
    const fnName = `${this.clName}.getConfig()`

    // The API key
    const apiKey = process.env[apiKeyEnvName]

    if (apiKey == null ||
        apiKey === ``) {

      throw new CustomError(`${fnName}: ${apiKeyEnvName} is not set. Set it ` +
        `to the key for ${baseUrlEnvName}.`)
    }

    // The model id
    const modelId = this.getModelId(aiTask)

    // The endpoint
    const baseUrl = process.env[baseUrlEnvName]

    if (baseUrl == null ||
        baseUrl === ``) {

      throw new CustomError(`${fnName}: ${baseUrlEnvName} is not set. Set it ` +
        `to an OpenAI-compatible endpoint.`)
    }

    // Return
    return {
      baseUrl: baseUrl,
      apiKey: apiKey,
      modelId: modelId
    }
  }

  getModel(aiTask: IntentCodeAiTasks): LanguageModel {

    // Debug
    const fnName = `${this.clName}.getModel()`

    // Get the config
    const config = this.getConfig(aiTask)

    // Create the model
    return createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })
    .chat(config.modelId)
  }
}
