import { BuildData, BuildFromFile } from '@/types/build-types'
import { ExtensionsData } from '@/types/source-graph-types'

export class CompilerQueryService {

  // Consts
  clName = 'CompilerQueryService'

  // Code
  getSkillPrompting(
    extensionsData: ExtensionsData,
    targetFileExt: string) {

    // Debug
    const fnName = `${this.clName}.getSkillPrompting()`

    // console.log(`${fnName}: fileExt: ${targetFileExt}`)
    // console.log(`${fnName}: extensionsData.skillNodes: ` +
    //             `${extensionsData.skillNodes.length}`)

    // Init prompting string
    var prompting = ''

    // Get indexer skills
    for (const skillNode of extensionsData.skillNodes) {

      // Get jsonContent
      const jsonContent = skillNode.jsonContent as any

      // Debug
      // console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

      // Has an indexer skill?
      if (jsonContent?.context?.fileExts == null) {
        continue
      }

      // Get fileExts as an array
      const fileExts =
              jsonContent?.context?.fileExts
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)

      // Add skill content to prompting
      if (fileExts.includes(targetFileExt)) {

        if (prompting.length > 0) {
          prompting += '\n'
        }

        prompting += skillNode.content
      }
    }

    // Debug
    // console.log(`${fnName}: prompting: ${prompting}`)

    // Return
    return prompting
  }

  getMultiFileSkillPrompting(
    buildData: BuildData,
    buildFromFiles: BuildFromFile[]) {

    // Var for skills by targetFileExt
    const skillsMap = new Map<string, string>()

    // Iterate buildFromFiles
    for (const buildFromFile of buildFromFiles) {

      if (skillsMap.has(buildFromFile.targetFileExt)) {
        continue
      }

      const targetLangPrompting =
        this.getSkillPrompting(
          buildData.extensionsData,
          buildFromFile.targetFileExt)

      skillsMap.set(
        buildFromFile.targetFileExt,
        targetLangPrompting)
    }

    // Return
    return skillsMap
  }
}
