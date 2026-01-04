import { ExtensionsData } from '@/types/source-graph-types'

export class CompilerQueryService {

  // Consts
  clName = 'CompilerQueryService'

  // Code
  getSkillPrompting(
    extensionsData: ExtensionsData,
    fileExt: string,
    targetLang: string) {

    // Init prompting string
    var prompting = ''

    // Get indexer skills
    for (const skillNode of extensionsData.skillNodes) {

      // Get jsonContent
      const jsonContent = skillNode.jsonContent as any

      // Has an indexer skill?
      if (jsonContent?.context?.fileExts == null) {
        continue
      }

      if (jsonContent.context.fileExts.includes(fileExt)) {

        if (prompting.length > 0) {
          prompting += '\n'
        }

        prompting += skillNode.content
      }
    }

    return prompting
  }
}
