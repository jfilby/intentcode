import path from 'path'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types'

// Services
const walkDirService = new WalkDirService()

// Class
export class TechStackQueryService {

  // Consts
  clName = 'TechStackQueryService'

  // Code
  async getFilename(projectDetails: ProjectDetails) {

    // Get intentCodePath
    const intentCodePath =
      (projectDetails.projectIntentCodeNode.jsonContent as any).path

    // Walk dir
    var mdFilesList: string[] = []

    await walkDirService.walkDir(
      intentCodePath,
      mdFilesList,
      {
        recursive: true,
        fileExts: ['.md']
      })

    // Debug
    // console.log(`${fnName}: mdFilesList: ` + JSON.stringify(mdFilesList))

    // Find the tech-stack.md file
    var techStackList: string[] = []

    for (const mdFilename of mdFilesList) {

      // Verify that this is tech-stack.md
      if (path.basename(mdFilename) === ServerOnlyTypes.techStackFilename) {
        techStackList.push(mdFilename)
      }
    }

    // Debug
    // console.log(`${fnName}: techStackList: ` + JSON.stringify(techStackList))

    // Verify exactly one instance of the tech-stack.md file
    if (techStackList.length === 0) {

      console.error(`No tech-stack.md file`)
      process.exit(1)

    } else if (techStackList.length > 1) {
      console.error(`More than one tech-stack.md file found`)
      process.exit(1)
    }

    // Get tech-stack.md full path
    const techStackFilename = techStackList[0]

    // Return
    return {
      intentCodePath,
      techStackFilename
    }
  }
}
