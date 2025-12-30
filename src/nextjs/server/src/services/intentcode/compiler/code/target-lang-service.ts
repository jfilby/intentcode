import { fileExtToLanguageName } from '@/types/source-code-types'

export class TargetLangService {

  // Consts
  clName = 'TargetLangService'

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

    const prompt =
      `- Wrap functions in a class where possible. Use the H1 name as the ` +
      `  class name.\n`

    return prompt
  }
}
