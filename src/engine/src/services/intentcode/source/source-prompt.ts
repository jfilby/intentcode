import fs from 'fs'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { BuildFromFile } from '@/types/build-types.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'

export class SourceAssistIntentCodeService {

  // Consts
  clName = 'SourceAssistIntentCodeService'

  // Code
  getSourceCodeFullPath(
    projectSourceNode: SourceNodeRecord,
    intentFileNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getSourceCodeFullPath()`

    // Get paths
    const sourceJsonContent = projectSourceNode.jsonContent
    const projectSourcePath =
      sourceJsonContent != null &&
      typeof sourceJsonContent === 'object' &&
      'path' in sourceJsonContent &&
      typeof sourceJsonContent.path === 'string'
        ? sourceJsonContent.path
        : undefined

    const intentJsonContent = intentFileNode.jsonContent
    const intentFileRelativePath =
      intentJsonContent != null &&
      typeof intentJsonContent === 'object' &&
      'relativePath' in intentJsonContent &&
      typeof intentJsonContent.relativePath === 'string'
        ? intentJsonContent.relativePath
        : undefined

    // Validate
    if (projectSourcePath == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: projectSourcePath == null`
      })
    }

    if (intentFileRelativePath == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: intentFileRelativePath == null`
      })
    }

    if (!intentFileRelativePath.endsWith(ServerOnlyTypes.dotMdFileExt)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: intentFileRelativePath doesn't end with ` +
          `${ServerOnlyTypes.dotMdFileExt}`
      })
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
          projectSourceNode: SourceNodeRecord,
          buildFromFile: BuildFromFile) {

    // Get source code's full path
    const sourceFullPath = await
            this.getSourceCodeFullPath(
              projectSourceNode,
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
