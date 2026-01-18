const fs = require('fs')
import { SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildFromFile } from '@/types/build-types'
import { ServerOnlyTypes } from '@/types/server-only-types'

export class SourceAssistIntentCodeService {

  // Consts
  clName = 'SourceAssistIntentCodeService'

  // Code
  getSourceCodeFullPath(
    projectSourceCodeNode: SourceNode,
    intentFileNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getSourceCodeFullPath()`

    // Get paths
    const projectSourcePath = (projectSourceCodeNode.jsonContent as any).path

    const intentFileRelativePath =
            (intentFileNode.jsonContent as any).relativePath

    // Validate
    if (projectSourcePath == null) {
      throw new CustomError(`${fnName}: projectSourcePath == null`)
    }

    if (intentFileRelativePath == null) {
      throw new CustomError(`${fnName}: intentFileRelativePath == null`)
    }

    if (!intentFileRelativePath.endsWith(ServerOnlyTypes.dotMdFileExt)) {

      throw new CustomError(
        `${fnName}: intentFileRelativePath doesn't end with ` +
        `${ServerOnlyTypes.dotMdFileExt}`)
    }

    // Get SourceCode relative path
    const sourceFileRelativePath =
            intentFileRelativePath.slice(
              0,
              intentFileRelativePath.length - ServerOnlyTypes.dotMdFileExt.length)

    const fullPath = projectSourcePath + sourceFileRelativePath

    // Return
    return fullPath
  }

  async getExistingSourcePrompting(
          projectSourceCodeNode: SourceNode,
          buildFromFile: BuildFromFile) {

    // Get source code's full path
    const sourceFullPath = await
            this.getSourceCodeFullPath(
              projectSourceCodeNode,
              buildFromFile.fileNode)

    // Check if the file exists
    if (await fs.existsSync(sourceFullPath) === false) {
      return null
    }

    // Read the source file
    const sourceCode = await
            fs.readFileSync(
              sourceFullPath,
              { encoding: 'utf8', flag: 'r' })

    // Create prompting
    const prompting =
      `## Existing source code\n` +
      `\n` +
      `This is the existing source code, which may have been based on \n` +
      `previous/different IntentCode. Reuse code where it makes sense.\n` +
      '```\n' +
      sourceCode
      '\n```\n' +
      `\n`

    // Return
    return prompting
  }
}
