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

    // General instructions
    var prompt =
      `- Wrap functions and basic static types in a class where possible. ` +
      `  Use the H1 name as the class name.\n` +
      `- Track these attributes where relevant:\n `+
      `  async, export, generator, static.\n`

    // Prompting to coerce the compiler LLM to produce correct code
    prompt +=
      `- Instantiate classes before using them to call non-static ` +
      `  functions.\n`

    // Return
    return prompt
  }
}
