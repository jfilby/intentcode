import { blake3 } from '@noble/hashes/blake3'
import { InputJsonValue } from '@/prisma/internal/prismaNamespace.js'
import { LlmCache, PrismaClient } from '@/prisma/client.js'
import { LlmMessage } from '@/types/ai-types.js'

// Contract
export interface LlmCacheGetResults {
  cacheKey: string
  inputMessage: string
  llmCache: LlmCache | null
}

// Class
export class LlmCacheService {

  // Consts
  clName = 'LlmCacheService'

  // Code

  // Only the prompt is hashed: the model id is part of the unique key, so the
  // same prompt is cached once per model.
  buildCacheKey(messages: LlmMessage[]) {

    // Build a stable string from the messages
    const inputMessage =
      messages
        .map((message) => `${message.role}\n${message.content}`)
        .join(`\n\n`)

    // Return
    return {
      cacheKey: blake3(inputMessage).toString(),
      inputMessage: inputMessage
    }
  }

  async tryGet(
          prisma: PrismaClient,
          modelId: string,
          messages: LlmMessage[]): Promise<LlmCacheGetResults> {

    // Debug
    const fnName = `${this.clName}.tryGet()`

    // Build the cache key
    const { cacheKey, inputMessage } =
      this.buildCacheKey(messages)

    // Query
    var llmCache: LlmCache | null = null

    try {
      llmCache = await prisma.llmCache.findFirst({
        where: {
          key: cacheKey,
          modelId: modelId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw error
    }

    // Return
    return {
      cacheKey: cacheKey,
      inputMessage: inputMessage,
      llmCache: llmCache
    }
  }

  async deleteByModelIdAndKey(
          prisma: PrismaClient,
          modelId: string,
          cacheKey: string) {

    // Debug
    const fnName = `${this.clName}.deleteByModelIdAndKey()`

    // Delete records
    try {
      await prisma.llmCache.deleteMany({
        where: {
          key: cacheKey,
          modelId: modelId
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw error
    }
  }

  async save(
          prisma: PrismaClient,
          modelId: string,
          cacheKey: string,
          inputMessage: string,
          outputMessage: string,
          outputJson: InputJsonValue) {

    // Debug
    const fnName = `${this.clName}.save()`

    // Upsert record
    try {
      await prisma.llmCache.upsert({
        where: {
          key_modelId: {
            key: cacheKey,
            modelId: modelId
          }
        },
        update: {
          inputMessage: inputMessage,
          outputMessage: outputMessage,
          outputJson: outputJson
        },
        create: {
          modelId: modelId,
          key: cacheKey,
          inputMessage: inputMessage,
          outputMessage: outputMessage,
          outputJson: outputJson
        }
      })
    } catch(error) {
      console.error(`${fnName}: error: ${error}`)
      throw error
    }
  }
}
