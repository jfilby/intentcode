import fs from 'fs'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { walkDir, type WalkDirConfig } from '@/core/walk-dir.js'
import { BuildData } from '@/types/build-types.js'
import { ProjectDetails } from '@/types/server-only-types.js'

// The IntentCode tree holds nothing but Markdown, one level down.
const INTENT_CODE_FILES: WalkDirConfig = {
  recursive: true,
  fileExts: ['.md']
}

// Class
export class IntentCodePromptingService {

  // Consts
  clName = 'IntentCodePromptingService'

  // Code
  async addProjectFilesPrompting(
          projectNo: number,
          projectDetails: ProjectDetails) {

    // Add existing IntentCode files
    const intentCodeFiles = await
            this.getIntentCodeFiles(projectDetails.projectIntentCodeNode)

    if (Object.keys(intentCodeFiles).length === 0) {
      return null
    }

    // Add prompting
    var prompting =
      `### Project no: ${projectNo}\n` +
      `\n`

    // Add each file
    for (const [intentCodeFilename, content] of
          Object.entries(intentCodeFiles)) {

      prompting +=
        `### ${intentCodeFilename}\n` +
        `\n` +
        '```md\n' +
        `${content}\n` +
        '```' +
        `\n`
    }

    // Return
    return prompting
  }

  async getAllPrompting(buildData: BuildData) {

    // Vars
    var prompting =
          `## IntentCode files\n` +
          `\n` +
          `These are the existing IntentCode files.\n` +
          `\n`

    // Iterate projects
    for (const [projectNo, projectDetails] of
         Object.entries(buildData.projects)) {

      // Add each project's files
      const projectPrompting = await
              this.addProjectFilesPrompting(
                Number(projectNo),
                projectDetails)

      if (projectPrompting != null) {
        prompting += projectPrompting
      }
    }

    // Return
    return prompting
  }

  async getIntentCodeFiles(projectIntentCodeNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getIntentCodeFiles()`

    // Get IntentCode path
    const jsonContent = projectIntentCodeNode.jsonContent
    const intentCodePath =
      jsonContent != null &&
      typeof jsonContent === 'object' &&
      'path' in jsonContent &&
      typeof jsonContent.path === 'string'
        ? jsonContent.path
        : undefined

    // Validate
    if (intentCodePath == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: projectIntentCodeNode has no path`
      })
    }

    // Walk dir
    var mdFilesList: string[] = []

    await walkDir(
            intentCodePath,
            mdFilesList,
            INTENT_CODE_FILES)

    // Read files
    var intentCodeFiles: Record<string, string> = {}

    for (const mdFilename of mdFilesList) {

      // Get relative path
      const relativePath = mdFilename.slice(intentCodePath.length)

      // Read file
      const content = await
              fs.readFileSync(
                mdFilename,
                { encoding: 'utf8', flag: 'r' })

      // Add to intentCodeFiles
      intentCodeFiles[relativePath] = content
    }

    // Return
    return intentCodeFiles
  }
}
