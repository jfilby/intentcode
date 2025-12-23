import { CustomError } from '@/serene-core-server/types/errors'
import { GoogleGeminiLlmService } from './llm-api'

// Services
const googleGeminiLlmService = new GoogleGeminiLlmService()

// Class
export class GoogleVertexEmbeddingsService {

  // Consts
  clName = 'GoogleVertexEmbeddingsService'

  // Code
  async requestBatchEmbeddings(texts: string[]) {

    // Debug
    const fnName = `${this.clName}.requestBatchEmbeddings()`

    // Get/create Gemini AI client
    const geminiAiClient = await
            googleGeminiLlmService.getOrCreateClient(
              prisma,
              undefined)  // tech

    // Validate
    if (geminiAiClient == null) {
      throw new CustomError(`${fnName}: geminiAiClient == null`)
    }

    // Make request
    const results = await geminiAiClient.models.embedContent({
      model: 'text-embedding-004',
      contents: texts
    })

    // Validate
    if (results.embeddings == null) {

      return {
        status: false,
        message: `results.embeddings == null`
      }
    }

    // Debug
    // console.log(`${fnName}: results: ` + JSON.stringify(results))

    // Return
    return {
      status: true,
      embeddings: results.embeddings
    }
  }

  async requestEmbedding(text: string) {

    // Debug
    const fnName = `${this.clName}.requestEmbedding()`

    // Get/create Gemini AI client
    // TOFIX: need to pass the model in the Gemini client instantiation: model: 'text-embedding-004'
    const geminiAiClient = await
            googleGeminiLlmService.getOrCreateClient(
              prisma,
              undefined)  // tech

    // Validate
    if (geminiAiClient == null) {
      throw new CustomError(`${fnName}: geminiAiClient == null`)
    }

    // Make request
    const results = await geminiAiClient.models.embedContent({
      model: 'text-embedding-004',
      contents: text
    })

    // Debug
    // console.log(`${fnName}: results: ` + JSON.stringify(results))

    // Return
    return {
      status: true,
      embedding: results.embeddings
    }
  }
}
