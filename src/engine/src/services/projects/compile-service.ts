import fs from 'fs'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { walkDir } from '@/core/walk-dir.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { CompilerService } from '../intentcode/compiler/code/compile-service.js'
import { FsUtilsService } from '../utils/fs-utils-service.js'
import { IntentCodeFilenameService } from '../utils/filename-service.js'
import { IntentCodePathGraphMutateService } from '../graphs/intentcode/path-graph-mutate-service.js'
import { ProjectDetails } from '@/types/server-only-types.js'

// Services
const compilerService = new CompilerService()
const fsUtilsService = new FsUtilsService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()

/**
 * The build's details for a project. A build holds every project it covers,
 * keyed by number, so the project is found by the id on the node rather than
 * by the number: the caller has a node, not a number.
 */
function getBuildProjectDetails(
          buildData: BuildData,
          projectId: string) {

  // Debug
  const fnName = 'getBuildProjectDetails()'

  for (const projectDetails of Object.values(buildData.projects)) {

    if (projectDetails.project.id === projectId) {
      return projectDetails
    }
  }

  throw new IntentError({
    category: 'CompilerError',
    stage: fnName,
    message: `no ProjectDetails in the build for projectId: ${projectId}`
  })
}

export class ProjectCompileService {

  // Consts
  clName = 'ProjectCompileService'

  // Code
  async getBuildFromFiles(
          store: ProjectStore,
          projectDetails: ProjectDetails) {

    // Get buildFileList
    const buildFileList = await this.getBuildFileList(projectDetails)

    // Iterate
    var buildFromFiles: any[] = []

    for (const buildFile of buildFileList) {

      // Get last save time of the file
      const fileModifiedTime = await
              fsUtilsService.getLastUpdateTime(buildFile.intentCodeFilename)

      // Read file
      const intentCode = await
              fs.readFileSync(
                buildFile.intentCodeFilename,
                { encoding: 'utf8', flag: 'r' })

      // Get/create the file's IntentCode node, recording what the file holds.
      // The graph is the record of what a project intended as well as of what
      // it built, so the Intent's own text is kept with it.
      const intentFileNode = await
        intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
          store,
          projectDetails.projectIntentCodeNode,
          buildFile.intentCodeFilename,
          intentCode)

      // Define BuildFromFile
      const buildFromFile: BuildFromFile = {
        filename: buildFile.intentCodeFilename,
        relativePath: buildFile.relativePath,
        fileModifiedTime: fileModifiedTime,
        content: intentCode,
        fileNode: intentFileNode,
        targetFileExt: buildFile.targetFileExt
      }

      // Add to buildFromFiles
      buildFromFiles.push(buildFromFile)
    }

    // Return
    return buildFromFiles
  }

  async getBuildFileList(projectDetails: ProjectDetails) {

    // Debug
    const fnName = `${this.clName}.getBuildFileList()`

    // Get IntentCode path
    const intentCodePath =
      (projectDetails.projectIntentCodeNode.jsonContent as any).path

    // Get IntentCode to compile
    var intentCodeList: string[] = []

    await walkDir(
      intentCodePath,
      intentCodeList,
      {
        recursive: true
      })

    // Compile
    var buildFileList: any[] = []

    for (const intentCodeFilename of intentCodeList) {

      // Get the target file extension from the IntentCode filename
      const targetFileExt =
        intentCodeFilenameService.getTargetFileExt(intentCodeFilename)

      // Safely skip files that don't have target exts
      if (targetFileExt == null) {

        /* console.log(
          `${fnName}: can't get target file extension from intentCode ` +
          `filename: ${intentCodeFilename}`) */

        continue
      }

      // Get relativePath
      const relativePath =
        intentCodeFilename.substring(intentCodePath.length + 1)

      // Add to buildFileList
      buildFileList.push({
        targetFileExt: targetFileExt,
        intentCodeFilename: intentCodeFilename,
        relativePath: relativePath
      })
    }

    // Return
    return buildFileList
  }

  async runCompileBuildStage(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.runCompileBuildStage()`

    console.log(`Compiling IntentCode..`)

    // Get ProjectDetails
    const projectDetails = getBuildProjectDetails(
      buildData,
      projectNode.projectId)

    // Get buildFromFiles
    const buildFromFiles = await
      this.getBuildFromFiles(store, projectDetails)

    // Compile IntentCode to source. Each file is a session of its own, so one
    // file that cannot be written does not take the rest of the project with
    // it.
    for (const buildFromFile of buildFromFiles) {

      await compilerService.run(
              store,
              buildData,
              projectDetails,
              buildFromFile)
    }

    // Done
    console.log(``)
  }

}
