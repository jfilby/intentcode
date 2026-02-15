const fs = require('fs')
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { CompilerMutateService } from '../intentcode/compiler/code/mutate-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { IndexerMutateService } from '../intentcode/indexer/mutate-service'
import { IntentCodeFilenameService } from '../utils/filename-service'
import { IntentCodePathGraphMutateService } from '../graphs/intentcode/path-graph-mutate-service'
import { ProjectsQueryService } from './query-service'
import { ProjectDetails } from '@/types/server-only-types'

// Services
const compilerMutateService = new CompilerMutateService()
const fsUtilsService = new FsUtilsService()
const indexerMutateService = new IndexerMutateService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const projectsQueryService = new ProjectsQueryService()
const walkDirService = new WalkDirService()

export class ProjectCompileService {

  // Consts
  clName = 'ProjectCompileService'

  // Code
  async getBuildFromFiles(projectDetails: ProjectDetails) {

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

      // Get/create the file's IntentCode node
      const intentFileNode = await
        intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
          prisma,
          projectDetails.projectIntentCodeNode,
          buildFile.intentCodeFilename)

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
    const fnName = `${this.clName}.prepForIntentCodeStage()`

    // Get IntentCode path
    const intentCodePath =
      (projectDetails.projectIntentCodeNode.jsonContent as any).path

    // Get IntentCode to compile
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
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

      // Validate
      if (targetFileExt == null) {

        console.warn(
          `${fnName}: can't get target file extension from intentCode ` +
          `filename: ${intentCodeFilename}`)

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
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.runCompileBuildStage()`

    console.log(`Compiling IntentCode..`)

    // Get ProjectDetails
    const projectDetails =
            projectsQueryService.getProjectDetailsByInstanceId(
              projectNode.instanceId,
              buildData.projects)

    if (projectDetails == null) {
      throw new CustomError(`${fnName}: projectDetails == null`)
    }

    // Get buildFromFiles
    const buildFromFiles = await
      this.getBuildFromFiles(projectDetails)

    // Compile IntentCode to source
    for (const buildFromFile of buildFromFiles) {

      // Compile
      await compilerMutateService.run(
              prisma,
              buildData,
              projectNode,
              projectDetails,
              buildFromFile)
    }
  }

  async runIndexBuildStage(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.runIndexBuildStage()`

    console.log(`Indexing IntentCode..`)

    // Get ProjectDetails
    const projectDetails =
            projectsQueryService.getProjectDetailsByInstanceId(
              projectNode.instanceId,
              buildData.projects)

    // Get buildFromFiles
    const buildFromFiles = await
      this.getBuildFromFiles(projectDetails)

    // Compile IntentCode to source
    for (const buildFromFile of buildFromFiles) {

      // Check if the file has been updated since last indexed
      if (buildFromFile?.contentUpdated != null &&
          buildFromFile.contentUpdated <= buildFromFile.fileModifiedTime) {

        // console.log(`${fnName}: file: ${intentCodeFilename} already indexed`)
        continue
      }

      // Index the file
      await indexerMutateService.indexFileWithLlm(
              prisma,
              buildData,
              projectNode,
              projectDetails.projectIntentCodeNode,
              buildFromFile)
    }
  }
}
