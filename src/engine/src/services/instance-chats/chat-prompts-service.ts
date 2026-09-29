import { AnalyzerChatParams } from '@/types/chat-types.js'
import { AnalyzerPromptTypes } from '@/types/server-only-types.js'
import { IntentCodeAnalyzerPromptService } from '../intentcode/analyzer/prompt-service.js'

// Services
const intentCodeAnalyzerPromptService = new IntentCodeAnalyzerPromptService()

// Class
export class ChatPromptsService {

  // Consts
  clName = 'ChatPromptsService'

  // Code
  async getAnalyzerSuggestionsPrompt(
    params: AnalyzerChatParams) {

    // Debug
    const fnName = `${this.clName}.getAnalyzerSuggestionsPrompt()`

    // console.log(`${fnName}: params: ` + JSON.stringify(params))

    // Get the prompt
    const prompt = await
      intentCodeAnalyzerPromptService.getPrompt(
        AnalyzerPromptTypes.chatAboutSuggestion,
        params.projectNode,
        params.buildData,
        params.buildFromFiles,
        params.suggestion)

    // Return
    return prompt
  }
}
