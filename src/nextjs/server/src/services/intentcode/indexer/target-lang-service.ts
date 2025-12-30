import { fileExtToLanguageName } from '@/types/source-code-types'

export class IndexerTargetLangService {

  // Consts
  clName = 'IndexerTargetLangService'

  // Code
  getPrompting(targetLang: string) {

    // Handle known cases
    switch (targetLang) {

      case fileExtToLanguageName['ts']:
        return this.getTypeScriptPrompting()

      default: {
        return null
      }
    }
  }

  getTypeScriptPrompting() {

    // General instructions
    var prompt =
      `- Wrap functions and basic static types in a class where possible. ` +
      `  Use the H1 name as the class name.\n` +
      `- Track these attributes where relevant:\n `+
      `  async, export, generator, static.\n`

    // Return
    return prompt
  }
}
