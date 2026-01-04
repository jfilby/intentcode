const fs = require('fs')
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { fileExtToLanguageName } from '../../types/source-code-types'
import { CompilerMutateService } from '../intentcode/compiler/code/mutate-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { GraphQueryService } from '../graphs/intentcode/graph-query-service'
import { IndexerMutateService } from '../intentcode/indexer/mutate-service'
import { IntentCodeFilenameService } from '../utils/filename-service'
import { BuildData } from '@/types/build-types'

// Services
const compilerMutateService = new CompilerMutateService()
const fsUtilsService = new FsUtilsService()
const graphQueryService = new GraphQueryService()
const indexerMutateService = new IndexerMutateService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const walkDirService = new WalkDirService()

export class ProjectCompileService {

  // Consts
  clName = 'ProjectCompileService'

  // Code
  async prepForIntentCodeStage(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.prepForIntentCodeStage()`

    // Get projectSourceNode
    const projectSourceNode = await
            graphQueryService.getProjectSourceNode(
              prisma,
              intentCodeProjectNode)

    // Get IntentCode to compile
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            (intentCodeProjectNode.jsonContent as any).path,
            intentCodeList)

    // Compile
    var buildFileList: any[] = []

    for (const intentCodeFilename of intentCodeList) {

      // Get the target file extension from the IntentCode filename
      const targetLangFileExt =
              intentCodeFilenameService.getTargetLang(intentCodeFilename)

      // Validate
      if (targetLangFileExt == null) {

        console.warn(
          `${fnName}: can't get target file extension from intentCode ` +
          `filename: ${intentCodeFilename}`)

        continue
      }

      if (!Object.hasOwn(fileExtToLanguageName, targetLangFileExt)) {

        console.warn(
         `${fnName}: can't get language name from target file extension: ` +
          `${targetLangFileExt}`)

        continue
      }

      // Get the target lang
      const targetLang = fileExtToLanguageName[targetLangFileExt]

      // Add to buildFileList
      buildFileList.push({
        targetLang: targetLang,
        intentCodeFilename: intentCodeFilename
      })
    }

    // Return
    return {
      projectSourceNode,
      buildFileList
    }
  }

  async runCompileBuildStage(
          prisma: PrismaClient,
          buildData: BuildData,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.runCompileBuildStage()`

    console.log(`Compiling IntentCode..`)

    // Prep for stage
    const { projectSourceNode, buildFileList } = await
            this.prepForIntentCodeStage(
              prisma,
              intentCodeProjectNode)

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
              intentCodeProjectNode,
              projectSourceNode,
              buildFile.intentCodeFilename,
              fileModifiedTime,
              buildFile.targetLang,
              intentCode)
    }
  }

  async runIndexBuildStage(
          prisma: PrismaClient,
          buildData: BuildData,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.runIndexBuildStage()`

    console.log(`Indexing IntentCode..`)

    // Prep for stage
    const { projectSourceNode, buildFileList } = await
            this.prepForIntentCodeStage(
              prisma,
              intentCodeProjectNode)

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
              intentCodeProjectNode,
              buildFile.intentCodeFilename,
              fileModifiedTime,
              buildFile.targetLang,
              intentCode)
    }
  }
}
