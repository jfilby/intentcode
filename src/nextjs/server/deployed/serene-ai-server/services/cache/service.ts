import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient } from '@prisma/client'
import { LlmCacheModel } from '../../models/cache/llm-cache-model'

// Types
export interface LlmGetInterface {
  cacheKey: string
  inputMessageStr: string
  llmCache: any
}

// Models
const llmCacheModel = new LlmCacheModel()

// Class
export class LlmCacheService {

  // Consts
  clName = 'LlmCacheService'

  // Code
  async deleteByTechIdAndKey(
          prisma: PrismaClient,
          llmTechId: string,
          cacheKey: string) {

    const llmCache = await
            llmCacheModel.getByTechIdAndKey(
              prisma,
              llmTechId,
              cacheKey)

    if (llmCache == null) {
      return
    }

    await llmCacheModel.deleteById(
            prisma,
            llmCache.id)
  }

  async tryGet(
          prisma: PrismaClient,
          llmTechId: string,
          messagesWithRoles: any[]): Promise<LlmGetInterface> {

    // Get stringified inputMessage
    const inputMessageStr = JSON.stringify(messagesWithRoles).toLowerCase()

    // Blake3 hash
    const cacheKey =
            blake3(inputMessageStr).toString()

    // Try to get an LlmCache
    const llmCache = await
            llmCacheModel.getByTechIdAndKey(
              prisma,
              llmTechId,
              cacheKey)

    // Verify input
    if (llmCache?.input != inputMessageStr) {

      return {
        cacheKey: cacheKey,
        inputMessageStr: inputMessageStr,
        llmCache: undefined
      }
    }

    // Return
    return {
      cacheKey: cacheKey,
      inputMessageStr: inputMessageStr,
      llmCache: llmCache
    }
  }

  async save(
          prisma: PrismaClient,
          llmTechId: string,
          cacheKey: string,
          inputMessage: string,
          outputMessage: any,
          outputMessages: any) {

    await llmCacheModel.upsert(
            prisma,
            undefined,  // id
            llmTechId,
            cacheKey!,
            inputMessage,
            outputMessage ?? null,   // message
            outputMessages ?? null)  // messages
  }
}
