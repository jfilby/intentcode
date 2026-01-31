import { BuildData } from '@/types/build-types'
import { FileOps } from '@/types/server-only-types'

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
    for (const fileDelta of intentCode) {

      // Validate projectNo
      if (!buildData.projectsMap.has(fileDelta.projectNo)) {

        console.log(`${fnName}: invalid projectNo: ${fileDelta.projectNo}`)
        return false
      }

      // Validate fileOp
      if (fileDelta.fileOp == null ||
          ![FileOps.set, FileOps.del].includes(fileDelta.fileOp)) {

        console.log(`${fnName}: invalid fileOp: ${fileDelta.fileOp}`)
        return false
      }

      // Validate relativePath
      if (fileDelta.relativePath == null ||
          fileDelta.relativePath.length === 0) {

        console.log(`${fnName}: invalid relativePath: ${fileDelta.relativePath}`)
        return false
      }

      // Validate content
      if (fileDelta.fileOp === FileOps.set &&
          (fileDelta.content == null ||
           fileDelta.content.length === 0)) {

        console.log(`${fnName}: invalid content (for set): ${fileDelta.content}`)
        return false
      }
    }

    // Validated OK
    return true
  }
}
