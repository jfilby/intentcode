import { BuildData } from '@/types/build-types'
import { FileDeltas } from '@/types/server-only-types'

// Class
export class IntentCodeUpdaterQueryService {

  // Consts
  clName = 'IntentCodeUpdaterQueryService'

  // Code
  validateFileDelta(
    buildData: BuildData,
    intentCode: any[]) {

    // Debug
    const fnName = `${this.clName}.validateFileDelta()`

    // Validate each entries
    for (const entry of intentCode) {

      // Validate projectNo
      if (!buildData.projectsMap.has(entry.projectNo)) {

        console.log(`${fnName}: invalid projectNo: ${entry.projectNo}`)
        return false
      }

      // Validate fileDelta
      if (entry.fileDelta == null ||
          ![FileDeltas.set, FileDeltas.del].includes(entry.fileDelta)) {

        console.log(`${fnName}: invalid fileDelta: ${entry.fileDelta}`)
        return false
      }

      // Validate relativePath
      if (entry.relativePath == null ||
          entry.relativePath.length === 0) {

        console.log(`${fnName}: invalid relativePath: ${entry.relativePath}`)
        return false
      }

      // Validate content
      if (entry.fileDelta === FileDeltas.set &&
          (entry.content == null ||
           entry.content.length === 0)) {

        console.log(`${fnName}: invalid content (for set): ${entry.content}`)
        return false
      }
    }

    // Validated OK
    return true
  }
}
