import { PrismaClient } from '@prisma/client'
import { AnalyzerChatParams } from '@/types/chat-types'
import { IntentCodeAnalyzerPromptService } from '../intentcode/analyzer/prompt-service'

// Services
const intentCodeAnalyzerPromptService = new IntentCodeAnalyzerPromptService()

// Class
export class ChatPromptsService {

  // Consts
  clName = 'ChatPromptsService'

  // Code
  async getAnalyzerSuggestionsPrompt(
    prisma: PrismaClient,
    params: AnalyzerChatParams) {

    // Debug
    const fnName = `${this.clName}.getAnalyzerSuggestionsPrompt()`

    console.log(`${fnName}: params: ` + JSON.stringify(params))

    // Get the prompt
    const prompt = await
      intentCodeAnalyzerPromptService.getPrompt(
        prisma,
        params.projectNode,
        params.buildData,
        params.buildFromFiles,
        `Chat with the user concerning this suggestion.`,
        params.suggestion)

    // Return
    return prompt
  }
}
