import fs from 'fs'
import { SourceNode } from '@prisma/client'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BuildData } from '@/types/build-types'
import { NumProject, ProjectDetails } from '@/types/server-only-types'

// Services
const walkDirService = new WalkDirService()

// Class
export class IntentCodePromptingService {

  // Consts
  clName = 'IntentCodePromptingService'

  // Code
  async addProjectFilesPrompting(
          numProject: NumProject,
          projectDetails: ProjectDetails) {

    // Add existing IntentCode files
    const intentCodeFiles = await
            this.getIntentCodeFiles(projectDetails.projectIntentCodeNode)

    if (intentCodeFiles.size == 0) {
      return null
    }

    // Add prompting
    var prompting =
      `### Project no: ${numProject.projectNo}\n` +
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
  }

  async getAllPrompting(buildData: BuildData) {

    // Vars
    var prompting =
          `## IntentCode files\n` +
          `\n` +
          `These are the existing IntentCode files.\n` +
          `\n`

    // Iterate projects
    for (const [numProject, projectDetails] of buildData.numberedProjectsMap) {

      // Add each project's files
      const projectPromping = await
              this.addProjectFilesPrompting(
                numProject,
                projectDetails)

      if (projectPromping != null) {
        prompting += projectPromping
      }
    }

    // Return
    return prompting
  }

  async getIntentCodeFiles(projectIntentCodeNode: SourceNode) {

    // Get IntentCode path
    const intentCodePath = (projectIntentCodeNode.jsonContent as any).path

    // Walk dir
    var mdFilesList: string[] = []

    await walkDirService.walkDir(
            intentCodePath,
            mdFilesList,
            {
              recursive: true,
              fileExts: ['.md']
            })

    // Read files
    var intentCodeFiles: any = {}

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
