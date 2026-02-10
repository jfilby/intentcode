import { Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { GoogleGeminiLlmService } from './llm-api'

// Services
const googleGeminiLlmService = new GoogleGeminiLlmService()

// Class
export class GoogleGeminiImageService {

  // Consts
  clName = 'GoogleGeminiImageService'

  // Code
  async generate(
          prompt: string,
          tech: Tech) {

    // Debug
    const fnName = `${this.clName}.generate()`

    // Get/create Gemini AI client
    const geminiAiClient = await
            googleGeminiLlmService.getOrCreateClient(
              prisma,
              tech)

    // Validate
    if (geminiAiClient == null) {
      throw new CustomError(`${fnName}: geminiAiClient == null`)
    }

    // API call
    const response = await geminiAiClient.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    })

    // Return
    return response
  }
}
