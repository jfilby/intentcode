const fs = require('fs')
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData } from '@/types/build-types'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { CompilerMutateService } from '../intentcode/compiler/code/mutate-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { IndexerMutateService } from '../intentcode/indexer/mutate-service'
import { IntentCodeFilenameService } from '../utils/filename-service'
import { ProjectGraphQueryService } from '../graphs/project/query-service'

// Services
const compilerMutateService = new CompilerMutateService()
const fsUtilsService = new FsUtilsService()
const indexerMutateService = new IndexerMutateService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const projectGraphQueryService = new ProjectGraphQueryService()
const walkDirService = new WalkDirService()

export class ProjectCompileService {

  // Consts
  clName = 'ProjectCompileService'

  // Code
  async prepForIntentCodeStage(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.prepForIntentCodeStage()`

    // Get intentCodeProjectNode
    const intentCodeProjectNode = await
            projectGraphQueryService.getIntentCodeProjectNode(
              prisma,
              projectNode)

    // Get sourceProjectNode
    const sourceCodeProjectNode = await
            projectGraphQueryService.getSourceProjectNode(
              prisma,
              projectNode)

    // Get IntentCode to compile
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            (intentCodeProjectNode.jsonContent as any).path,
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

      // Add to buildFileList
      buildFileList.push({
        targetFileExt: targetFileExt,
        intentCodeFilename: intentCodeFilename
      })
    }

    // Return
    return {
      intentCodeProjectNode,
      sourceCodeProjectNode,
      buildFileList
    }
  }

  async runCompileBuildStage(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.runCompileBuildStage()`

    console.log(`Compiling IntentCode..`)

    // Prep for stage
    const { intentCodeProjectNode, sourceCodeProjectNode, buildFileList } = await
            this.prepForIntentCodeStage(
              prisma,
              projectNode)

    // Compile IntentCode to source
    for (const buildFile of buildFileList) {

      // Get last save time of the file
      const fileModifiedTime = await
              fsUtilsService.getLastUpdateTime(buildFile.intentCodeFilename)

      // Read file
      const intentCode = await
              fs.readFileSync(
                buildFile.intentCodeFilename,
                { encoding: 'utf8', flag: 'r' })

      // Compile
      await compilerMutateService.run(
              prisma,
              buildData,
              projectNode,
              intentCodeProjectNode,
              sourceCodeProjectNode,
              buildFile.intentCodeFilename,
              fileModifiedTime,
              buildFile.targetFileExt,
              intentCode)
    }
  }

  async runIndexBuildStage(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.runIndexBuildStage()`

    console.log(`Indexing IntentCode..`)

    // Prep for stage
    const { intentCodeProjectNode, sourceCodeProjectNode, buildFileList } = await
            this.prepForIntentCodeStage(
              prisma,
              projectNode)

    // Index IntentCode
    for (const buildFile of buildFileList) {

      // Get last save time of the file
      const fileModifiedTime = await
              fsUtilsService.getLastUpdateTime(buildFile.intentCodeFilename)

      // Read file
      const intentCode = await
              fs.readFileSync(
                buildFile.intentCodeFilename,
                { encoding: 'utf8', flag: 'r' })

      // Index the file
      await indexerMutateService.indexFileWithLlm(
              prisma,
              buildData,
              projectNode,
              intentCodeProjectNode,
              buildFile.intentCodeFilename,
              fileModifiedTime,
              buildFile.targetFileExt,
              intentCode)
    }
  }
}
