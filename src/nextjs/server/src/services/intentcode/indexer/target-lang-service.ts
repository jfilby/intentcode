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
      `- Wrap functions and basic types in a class where possible. ` +
      `  Use the H1 name as the class name.\n` +
      `- Make use of and adhere to these attributes where relevant:\n `+
      `  async, export, generator, static.\n`

    // Opinionated coding
    prompt +=
      `- Don't use hidden state in classes, rather pass parameters.\n` +
      `- Instantiate classes before calling their non-static functions.\n`

    // Return
    return prompt
  }
}
