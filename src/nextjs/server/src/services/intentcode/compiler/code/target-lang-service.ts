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
      `- Wrap functions and basic static types in a class where possible. ` +
      `  Use the H1 name as the class name.\n` +
      `- Instantiate classes that aren't static before using them.\n` +

      // removed, now test without: `in the AST tree`
      `- Track these attributes where relevant:\n `+
      `  async, export, generator, static.\n`

    return prompt
  }
}
