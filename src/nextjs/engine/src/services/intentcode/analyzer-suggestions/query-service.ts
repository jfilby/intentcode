import { TextParsingService } from '@/serene-ai-server/services/content/text-parsing-service'

// Services
const textParsingService = new TextParsingService()

// Class
export class IntentCodeAnalyzerSuggestionsQueryService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsQueryService'

  // Code
  async reviewSuggestion(suggestion: any) {

    // Output
    console.log(``)
    console.log(`${suggestion.priority}: ${suggestion.text}`)

    if (suggestion.fileDeltas.length > 0) {
      console.log(`Files to change:`)
    }

    // Iterate fileDeltas
    for (const fileDelta of suggestion.fileDeltas) {

      // Output
      console.log(`${fileDelta.fileDelta} ${fileDelta.relativePath}`)

      /* Pre-process the content (if needed)
      if (fileDelta.content != null) {

        const contentExtracts =
          textParsingService.getTextExtracts(fileDelta.content)

        fileDelta.content =
          textParsingService.combineTextExtracts(contentExtracts.extracts, '')
      } */
    }
  }
}
