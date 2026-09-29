import { generateText, ModelMessage } from 'ai'
import { IntentError } from '@/core/errors.js'
import { findProjectRoot, readProjectConfig } from '@/core/project-config.js'
import type { ProjectConfig } from '@/core/project-config.js'
import type { ProjectStore } from '@/core/store.js'
import { resolveModelForTask, type ModelConfiguration } from '@/core/ai/model.js'
import { createLanguageModel } from '@/core/ai/provider.js'
import { LlmMessage } from '@/types/ai-types.js'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types.js'
import { LlmCacheService } from './llm-cache-service.js'

// Consts
const requestTries = 5

// The config of each project read so far. A build makes many requests
// against the same intent.toml, and the file is what names its models, so it
// is read once per project rather than once per request.
const projectConfigs = new Map<string, ProjectConfig | undefined>()

// Contract
export interface LlmRequestParams {
  store: ProjectStore
  aiTask: IntentCodeAiTasks
  system?: string
  prompt: string
  isJsonMode: boolean
  validate?: (json: unknown) => Promise<boolean>
}

export interface LlmRequestResults {
  modelId: string
  text: string
  json: unknown
  fromCache: boolean
}

export interface LlmChatParams {
  aiTask: IntentCodeAiTasks
  system?: string
  messages: ModelMessage[]
  isJsonMode: boolean
}

export interface LlmChatResults {
  modelId: string
  text: string
  json: unknown
}

// Services
const llmCacheService = new LlmCacheService()

// Class
export class LlmService {

  // Consts
  clName = 'LlmService'

  // Code

  // A single-shot request: one system prompt, one user prompt, one reply.
  // Results are cached per model, and retried while they fail validation.
  async request(params: LlmRequestParams): Promise<LlmRequestResults> {

    // Debug
    const fnName = `${this.clName}.request()`

    // The model id partitions the cache
    const modelId = (await this.getModelConfig(params.aiTask)).id

    // The messages being sent (also what the cache key is built from)
    const cacheMessages: LlmMessage[] = []

    if (params.system != null &&
        params.system !== ``) {

      cacheMessages.push({
        role: 'system',
        content: params.system
      })
    }

    cacheMessages.push({
      role: 'user',
      content: params.prompt
    })

    // Try to get from the cache
    var cacheKey: string | undefined = undefined
    var inputMessage: string | undefined = undefined

    if (ServerOnlyTypes.llmCaching === true) {

      const cacheResults = await
        llmCacheService.tryGet(
          params.store,
          modelId,
          cacheMessages)

      cacheKey = cacheResults.cacheKey
      inputMessage = cacheResults.inputMessage

      const cachedJson = cacheResults.llmCache?.outputJson

      if (cachedJson != null) {

        // Return
        return {
          modelId: modelId,
          text: cacheResults.llmCache?.outputMessage ?? ``,
          json: cachedJson,
          fromCache: true
        }
      }
    }

    // Request, retrying for as long as the reply fails validation
    for (var i = 0; i < requestTries; i++) {

      // Generate
      const text = await
        this.generateText(
          params.aiTask,
          params.system,
          [
            {
              role: 'user',
              content: params.prompt
            }
          ])

      // Extract the JSON
      const json = params.isJsonMode === true ? extractJson(text) : null

      // Validate
      var valid = params.isJsonMode === false

      if (params.isJsonMode === true) {

        valid = json != null

        if (valid === true &&
            params.validate != null) {

          valid = await params.validate(json)
        }
      }

      // Retry
      if (valid === false) {

        console.log(`${fnName}: try ${i + 1} of ${requestTries} failed ` +
          `validation, retrying..`)

        // The cached entry (if any) is what failed
        if (cacheKey != null) {

          await llmCacheService.deleteByModelIdAndKey(
            params.store,
            modelId,
            cacheKey)
        }

        continue
      }

      // Save to the cache
      if (cacheKey != null) {

        await llmCacheService.save(
          params.store,
          modelId,
          cacheKey,
          inputMessage!,
          text,
          json ?? text)
      }

      // Return
      return {
        modelId: modelId,
        text: text,
        json: json,
        fromCache: false
      }
    }

    // Validate
    throw new IntentError({
      category: 'AiError',
      stage: fnName,
      message: `no valid reply after ${requestTries} tries for the ` +
        `${modelId} model`
    })
  }

  // A chat turn. Not cached: the message list grows with every turn, so a
  // cache entry would never be hit again and the file would grow without
  // bound.
  async chat(params: LlmChatParams): Promise<LlmChatResults> {

    // Debug
    const fnName = `${this.clName}.chat()`

    // The model id
    const modelId = (await this.getModelConfig(params.aiTask)).id

    // Generate
    const text = await
      this.generateText(
        params.aiTask,
        params.system,
        params.messages)

    // Extract the JSON
    const json = params.isJsonMode === true ? extractJson(text) : null

    // Validate
    if (params.isJsonMode === true &&
        json == null) {

      throw new IntentError({
        category: 'AiError',
        stage: fnName,
        message: `no JSON in the reply from the ${modelId} model: ` + text
      })
    }

    // Return
    return {
      modelId: modelId,
      text: text,
      json: json
    }
  }

  async generateText(
          aiTask: IntentCodeAiTasks,
          system: string | undefined,
          messages: ModelMessage[]) {

    // Debug
    const fnName = `${this.clName}.generateText()`

    // The model
    const model = createLanguageModel(
      await this.getModelConfig(aiTask))

    // Generate
    const { text } = await generateText({
      model: model,
      system: system,
      messages: messages,
      maxRetries: 2
    })

    // Return
    return text
  }

  /**
   * The model a task runs on. A project names its own models in its
   * intent.toml, so the config of the project the command is running in is
   * read and passed down; a project with no [model] table, and a command run
   * outside a project, fall through to the environment.
   */
  private async getModelConfig(
          aiTask: IntentCodeAiTasks): Promise<ModelConfiguration> {

    // The project the command is running in
    const projectPath = findProjectRoot()

    if (projectPath == null) {

      return resolveModelForTask(aiTask, undefined, undefined)
    }

    // Its config, read once
    if (projectConfigs.has(projectPath) === false) {

      const projectConfig =
        await readProjectConfig(projectPath)
          .catch(() => undefined)

      projectConfigs.set(projectPath, projectConfig)
    }

    const projectConfig = projectConfigs.get(projectPath)

    // Return
    return resolveModelForTask(
      aiTask,
      projectConfig?.model,
      projectConfig?.models)
  }
}

// Models wrap JSON in a markdown fence or in prose. Take the outermost
// object or array and parse it.
function extractJson(text: string): unknown | null {

  // Strip a markdown fence
  const unfenced =
    text
      .replace(/^\s*```(?:json)?\s*/i, ``)
      .replace(/\s*```\s*$/, ``)
      .trim()

  // Find the outermost object or array
  const startIndex = unfenced.search(/[[{]/)

  if (startIndex === -1) {
    return null
  }

  const closing = unfenced[startIndex] === '{' ? '}' : ']'
  const endIndex = unfenced.lastIndexOf(closing)

  if (endIndex <= startIndex) {
    return null
  }

  // Parse
  try {
    return JSON.parse(unfenced.slice(startIndex, endIndex + 1))
  } catch {
    return null
  }
}
