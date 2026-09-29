/**
 * Provider construction.
 *
 * One place turns a resolved model configuration into a Vercel AI SDK model.
 * Every provider is reached through its OpenAI-compatible chat interface where
 * it has one, so a new provider is a row in this file rather than a branch
 * through the services.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { IntentError } from '../errors.js'
import type { ModelConfiguration } from './model.js'

/**
 * The model to generate with. Anthropic is the one provider reached through
 * its own package, because its messages API is not OpenAI-shaped; the rest
 * are OpenAI-compatible.
 */
export function createLanguageModel(
  config: ModelConfiguration
): LanguageModel {

  switch (config.provider) {

    case 'anthropic': {
      return createAnthropic({ apiKey: config.apiKey })
        .chat(config.model)
    }

    case 'google': {
      // Google's OpenAI-compatible endpoint is the one addressable without a
      // regional host, and it serves the same models as the native package.
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl ??
          'https://generativelanguage.googleapis.com/v1beta/openai/'
      }).chat(config.model)
    }

    case 'openai':
    case 'openrouter':
    case 'openai-compatible': {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl == null ? {} : { baseURL: config.baseUrl }),
        ...(config.headers == null ? {} : { headers: config.headers })
      })
      return openai.chat(config.model)
    }

    default: {
      throw new IntentError({
        category: 'AiError',
        stage: 'model',
        message: `no provider builds the model "${config.id}"`
      })
    }
  }
}
