import { generateText, ModelMessage } from 'ai'
import { CustomError } from 'serene-core-server'
import { PrismaClient } from '@/prisma/client.js'
import { LlmMessage } from '@/types/ai-types.js'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types.js'
import { AiModelService } from './ai-model-service.js'
import { LlmCacheService } from './llm-cache-service.js'

// Consts
const requestTries = 5

// Contract
export interface LlmRequestParams {
  prisma: PrismaClient
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
const aiModelService = new AiModelService()
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
    const modelId = aiModelService.getModelId(params.aiTask)

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
          params.prisma,
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
            params.prisma,
            modelId,
            cacheKey)
        }

        continue
      }

      // Save to the cache
      if (cacheKey != null) {

        await llmCacheService.save(
          params.prisma,
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
    throw new CustomError(`${fnName}: no valid reply after ` +
      `${requestTries} tries for the ${modelId} model`)
  }

  // A chat turn. Not cached: the message list grows with every turn, so a
  // cache entry would never be hit again and the table would grow without
  // bound.
  async chat(params: LlmChatParams): Promise<LlmChatResults> {

    // Debug
    const fnName = `${this.clName}.chat()`

    // The model id
    const modelId = aiModelService.getModelId(params.aiTask)

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

      throw new CustomError(`${fnName}: no JSON in the reply from ` +
        `the ${modelId} model: ` + text)
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
    const model = aiModelService.getModel(aiTask)

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
