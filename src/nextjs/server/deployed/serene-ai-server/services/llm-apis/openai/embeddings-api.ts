import { PrismaClient } from '@prisma/client'
import { OpenAiLlmService } from './llm-service'

// Services
const openAiLlmService = new OpenAiLlmService()

// Class
export class OpenAiEmbeddingsService {

  // Consts
  clName = 'OpenAiEmbeddingsService'

  // Code
  async requestEmbedding(
          prisma: PrismaClient,
          tech: any,
          text: string) {

    // Debug
    const fnName = `${this.clName}.requestEmbedding()`

    // Get an OpenAI client
    const openAi = await
            openAiLlmService.getOrCreateClient(
              prisma,
              tech)

    // Make request
    const response = await openAi?.embeddings.create({
      model: tech.model,
      input: text,
      encoding_format: 'float'
    })

    // Validate
    if (response == null) {

      return {
        status: false,
        message: `response == null`
      }
    }

    // Get embedding
    const embedding = response.data[0].embedding

    // Debug
    // console.log(`${fnName}: embedding: ` + JSON.stringify(embedding))

    // Return
    return {
      status: true,
      embedding: embedding
    }
  }
}
