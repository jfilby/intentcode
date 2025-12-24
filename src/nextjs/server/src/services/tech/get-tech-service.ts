import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'

// Models
const techModel = new TechModel()

// Class
export class GetTechService {

  // Consts
  clName = 'GetTechService'

  // Code
  async getChatLlmTech(
          prisma: PrismaClient,
          userProfileId: string | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.getChatLlmTech()`

    // Validate
    if (process.env.CHAT_LLM_VARIANT_NAME == null ||
        process.env.CHAT_LLM_VARIANT_NAME === '') {

      throw new CustomError(`${fnName}: env var ` +
                            `CHAT_LLM_VARIANT_NAME not specified`)
    }

    // Defined LLM variant name
    const variantName = process.env.CHAT_LLM_VARIANT_NAME!

    // Get the standard LLM to use
    const tech = await
            techModel.getByVariantName(
              prisma,
              variantName)

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null for variantName: ` +
                            `${variantName}`)
    }

    // Return
    return tech
  }

  async getEmbeddingsTech(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.getEmbeddingsTech()`

    // Validate
    if (process.env.STANDARD_EMBEDDINGS_VARIANT_NAME == null ||
        process.env.STANDARD_EMBEDDINGS_VARIANT_NAME === '') {

      throw new CustomError(`${fnName}: env var ` +
                            `STANDARD_EMBEDDINGS_VARIANT_NAME not specified`)
    }

    // Defined LLM variant name
    const variantName = process.env.STANDARD_EMBEDDINGS_VARIANT_NAME!

    // Get the standard LLM to use
    const tech = await
            techModel.getByVariantName(
              prisma,
              variantName)

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null for variantName: ` +
                            `${variantName}`)
    }

    // Return
    return tech
  }

  async getImageTech(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.getStandardLlmTech()`

    // Validate
    if (process.env.IMAGE_VARIANT_NAME == null ||
        process.env.IMAGE_VARIANT_NAME === '') {

      throw new CustomError(`${fnName}: env var ` +
                            `IMAGE_VARIANT_NAME not specified`)
    }

    // Defined LLM variant name
    const variantName = process.env.IMAGE_VARIANT_NAME!

    // Get the standard LLM to use
    const tech = await
            techModel.getByVariantName(
              prisma,
              variantName)

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null for variantName: ` +
                            `${variantName}`)
    }

    // Return
    return tech
  }

  async getStandardLlmTech(
          prisma: PrismaClient,
          userProfileId: string | undefined = undefined) {

    // Debug
    const fnName = `${this.clName}.getStandardLlmTech()`

    // Validate
    if (process.env.STANDARD_LLM_VARIANT_NAME == null ||
        process.env.STANDARD_LLM_VARIANT_NAME === '') {

      throw new CustomError(`${fnName}: env var ` +
                            `STANDARD_LLM_VARIANT_NAME not specified`)
    }

    // Defined LLM variant name
    const variantName = process.env.STANDARD_LLM_VARIANT_NAME!

    // Get the standard LLM to use
    const tech = await
            techModel.getByVariantName(
              prisma,
              variantName)

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null for variantName: ` +
                            `${variantName}`)
    }

    // Return
    return tech
  }
}
