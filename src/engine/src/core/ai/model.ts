/**
 * Model configuration.
 *
 * The engine contains no provider-specific logic beyond resolving which
 * provider package to construct and with which credentials. The selection
 * comes from the project's `intent.toml`, then the environment:
 *
 *   AI_MODEL=openai/gpt-5                     Vercel AI SDK provider + model id
 *   AI_MODEL=anthropic/claude-sonnet-4-5
 *   AI_MODEL=google/gemini-3.1-pro-preview
 *   AI_MODEL=openrouter/anthropic/claude-sonnet-4.5
 *   AI_MODEL=openai-compatible/my-model      with AI_BASE_URL
 *
 *   AI_API_KEY      generic credential
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY
 *   OPENROUTER_API_KEY  enables the openrouter provider
 *   AI_BASE_URL     endpoint for openai-compatible providers
 *   OPENROUTER_SITE_URL, OPENROUTER_APP_NAME  optional OpenRouter attribution
 *
 * A project's `intent.toml` names the model in a `[model]` table, and an
 * `intent.toml` may give an AI task its own under `[models.<task>]`. The
 * config file wins over the environment, because a project that names a model
 * is stating which one it is built with; the environment is the fallback for
 * a project that does not.
 */

import { IntentError } from '../errors.js'
import type { ProjectModelConfig } from '../project-config.js'

export type ProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'openai-compatible'

/** OpenRouter serves every model behind one OpenAI compatible endpoint. */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

/** The provider used when a model id names no provider of its own. */
export const DEFAULT_PROVIDER: ProviderName = 'openai-compatible'

export interface ModelConfiguration {
  /** Recorded in a generation record, so a build says which model made it. */
  readonly id: string
  readonly provider: ProviderName
  readonly model: string
  readonly apiKey: string
  readonly baseUrl?: string
  /** Extra request headers, such as the attribution OpenRouter accepts. */
  readonly headers?: Record<string, string>
}

const ENV_KEYS: Record<ProviderName, readonly string[]> = {
  openai: ['OPENAI_API_KEY', 'AI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY', 'AI_API_KEY'],
  google: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY', 'AI_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY', 'AI_API_KEY'],
  'openai-compatible': ['AI_API_KEY']
}

/** A `[model]` table that names a provider but no model id. */
const PROVIDER_ONLY: Record<string, ProviderName> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google',
  gemini: 'google',
  openrouter: 'openrouter',
  'openai-compatible': 'openai-compatible'
}

function modelError(message: string, detail?: string): IntentError {
  return new IntentError({
    category: 'AiError',
    stage: 'model',
    message,
    detail
  })
}

function firstEnvKey(
  provider: ProviderName,
  env: NodeJS.ProcessEnv
): string | undefined {

  for (const key of ENV_KEYS[provider]) {
    const value = env[key]
    if (value !== undefined && value !== '') return value
  }
  return undefined
}

/**
 * Resolves a model from a spec and the environment. A missing or malformed
 * configuration fails loudly rather than producing a compiler that cannot
 * generate anything.
 */
export function resolveModel(
  spec: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): ModelConfiguration {

  const requested = spec ?? env.AI_MODEL ?? ''

  if (requested === '') {
    throw modelError(
      'no model configured',
      'set a [model] table in intent.toml, or set AI_MODEL ' +
        '(for example AI_MODEL=google/gemini-3.1-pro-preview)'
    )
  }

  const separator = requested.indexOf('/')
  const providerName = separator > 0
    ? requested.slice(0, separator)
    : undefined
  const model = separator > 0
    ? requested.slice(separator + 1)
    : requested

  if (model === '') {
    throw modelError(
      `invalid model "${requested}"`,
      'expected provider/model, for example google/gemini-3.1-pro-preview'
    )
  }

  // A spec whose first segment is not a known provider names a model on the
  // default provider, so `AI_MODEL=gemini-3.1-pro-preview` still works.
  const provider: ProviderName =
    providerName != null && Object.hasOwn(ENV_KEYS, providerName)
      ? providerName as ProviderName
      : separator > 0 && providerName != null &&
          Object.hasOwn(PROVIDER_ONLY, providerName)
        ? PROVIDER_ONLY[providerName]
        : DEFAULT_PROVIDER

  const apiKey = firstEnvKey(provider, env)

  if (apiKey === undefined) {
    throw modelError(
      `missing API key for provider "${provider}"`,
      `set one of ${ENV_KEYS[provider].join(', ')}`
    )
  }

  const baseUrl =
    provider === 'openrouter'
      ? env.AI_BASE_URL || OPENROUTER_BASE_URL
      : provider === 'openai-compatible'
        ? env.AI_BASE_URL
        : undefined

  if (provider === 'openai-compatible' && baseUrl === undefined) {
    throw modelError(
      'the openai-compatible provider needs an endpoint',
      'set AI_BASE_URL to the provider endpoint'
    )
  }

  // OpenRouter attributes requests to the app that made them when these are
  // set.
  const headers: Record<string, string> = {}
  if (env.OPENROUTER_SITE_URL != null && env.OPENROUTER_SITE_URL !== '') {
    headers['HTTP-Referer'] = env.OPENROUTER_SITE_URL
  }
  if (env.OPENROUTER_APP_NAME != null && env.OPENROUTER_APP_NAME !== '') {
    headers['X-Title'] = env.OPENROUTER_APP_NAME
  }

  return {
    id: requested,
    provider,
    model,
    apiKey,
    ...(baseUrl === undefined ? {} : { baseUrl }),
    ...(Object.keys(headers).length === 0 ? {} : { headers })
  }
}

/**
 * Resolves from a project's `[model]` and `[models.<task>]` tables, falling
 * back to the environment. A table that names a provider and a model
 * separately is joined into one spec, because that is the form the
 * environment uses and the one every provider package is constructed from.
 */
export function resolveModelForTask(
  task: string,
  shared: ProjectModelConfig | undefined,
  perTask: Record<string, ProjectModelConfig> | undefined,
  env: NodeJS.ProcessEnv = process.env
): ModelConfiguration {

  const config = perTask?.[task] ?? shared

  if (config == null) return resolveModel(undefined, env)

  // A table naming only a provider is a request for that provider's default
  // model, which only the environment can say, so the two halves are joined
  // rather than one silently standing in for the other.
  if (config.model == null && config.provider != null) {
    const fromEnv = env.AI_MODEL ?? ''
    const separator = fromEnv.indexOf('/')
    if (separator <= 0) {
      throw modelError(
        `the model for ${task} names a provider but no model`,
        'set "model" in the [model] table, or set AI_MODEL to ' +
          `${config.provider}/<model>`
      )
    }
    return resolveModel(
      `${config.provider}/${fromEnv.slice(separator + 1)}`, env)
  }

  if (config.model == null) {
    throw modelError(
      `the model for ${task} names no model`,
      'set "model" in the [model] table in intent.toml'
    )
  }

  // A model id may already carry its provider; joining it again would name a
  // provider "google/google".
  return resolveModel(
    config.model.includes('/') || config.provider == null
      ? config.model
      : `${config.provider}/${config.model}`,
    env
  )
}
