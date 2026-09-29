/**
 * Provider construction.
 *
 * One place turns a resolved model configuration into a Vercel AI SDK model.
 * A provider with an OpenAI-shaped surface is reached through the compatible
 * package, which speaks that surface without OpenAI's own defaults; a provider
 * with its own transport is reached through its own module. Either way, adding
 * a provider is a row in this file rather than a branch through the services.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import { IntentError } from '../errors.js'
import { createCommandCode } from './commandcode.js'
import type { ModelConfiguration } from './model.js'

/**
 * The model to generate with.
 *
 * CommandCode is the one provider with a transport of its own, in
 * `commandcode.ts`. OpenRouter and any other OpenAI-shaped endpoint go through
 * the compatible package rather than OpenAI's, because that package adds none
 * of OpenAI's own defaults to a gateway that does not want them.
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

    case 'openai': {
      return createOpenAI({ apiKey: config.apiKey }).chat(config.model)
    }

    case 'openrouter':
    case 'openai-compatible': {
      return createOpenAICompatible({
        name: config.provider,
        baseURL: config.baseUrl ?? '',
        apiKey: config.apiKey,
        ...(config.headers == null ? {} : { headers: config.headers })
      })(config.model)
    }

    case 'commandcode': {
      return createCommandCode({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? '',
        ...(config.headers == null ? {} : { headers: config.headers })
      })(config.model)
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
