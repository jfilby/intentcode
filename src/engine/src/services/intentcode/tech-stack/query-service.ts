import path from 'path'
import { walkDir } from '@/core/walk-dir.js'
import { ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types.js'

// Class
export class TechStackQueryService {

  // Consts
  clName = 'TechStackQueryService'

  // Code
  async getFilename(projectDetails: ProjectDetails) {

    // Get intentCodePath
    const jsonContent = projectDetails.projectIntentCodeNode.jsonContent
    const intentCodePath =
      jsonContent != null && typeof jsonContent === 'object' &&
      'path' in jsonContent && typeof jsonContent.path === 'string'
        ? jsonContent.path
        : undefined

    // Validate. A project node without its path has no IntentCode tree to
    // walk, so there is no tech-stack.md to find.
    if (intentCodePath == null) {

      console.error(`The IntentCode project node has no path`)
      process.exit(1)
    }

    // Walk dir
    const mdFilesList: string[] = []

    await walkDir(
      intentCodePath,
      mdFilesList,
      {
        recursive: true,
        fileExts: ['.md']
      })

    // Debug
    // console.log(`${fnName}: mdFilesList: ` + JSON.stringify(mdFilesList))

    // Find the tech-stack.md file
    const techStackList: string[] = []

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
