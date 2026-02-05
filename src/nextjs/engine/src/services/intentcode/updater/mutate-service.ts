import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TextParsingService } from '@/serene-ai-server/services/content/text-parsing-service'
import { BuildData } from '@/types/build-types'
import { FileDelta, FileOps, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'

// Service
const fsUtilsService = new FsUtilsService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const textParsingService = new TextParsingService()

// Class
export class IntentCodeUpdaterMutateService {

  // Consts
  clName = 'IntentCodeUpdaterMutateService'

  // Code
  async processFileDelta(
    prisma: PrismaClient,
    buildData: BuildData,
    fileDelta: FileDelta) {

    // Debug
    const fnName = `${this.clName}.processFileDelta()`

    // Output
    // Pre-process the content (if needed)
    if (fileDelta.content != null) {

      const contentExtracts =
        textParsingService.getTextExtracts(fileDelta.content)

      fileDelta.content =
        textParsingService.combineTextExtracts(contentExtracts.extracts, '')
    }

    // Get projectDetails
    const projectDetails = buildData.projects[fileDelta.projectNo]

    // Validate
    if (projectDetails == null) {
      throw new CustomError(`${fnName}: projectDetails == null`)
    }

    // Get IntentCode path
    const intentCodePath =
      (projectDetails.projectIntentCodeNode.jsonContent as any).path

    // Determine intentCodeFullPath
    const intentCodeFullPath =
      `${intentCodePath}${path.sep}${fileDelta.relativePath}`

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.min) {

      console.log(`.. ${fileDelta.fileOp} ${intentCodeFullPath}`)
    }

    // Upsert SourceCode node path
    if (fileDelta.fileOp === FileOps.set) {

      // Upsert IntentCode path graph
      await intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
        prisma,
        projectDetails.projectIntentCodeNode,
        intentCodeFullPath)

      // Write source file
      await fsUtilsService.writeTextFile(
        intentCodeFullPath,
        fileDelta.content + `\n`,
        true)  // createMissingDirs

    } else if (fileDelta.fileOp === FileOps.del) {

      // Delete IntentCode path graph
      await intentCodePathGraphMutateService.deleteIntentCodePathAsGraph(
        prisma,
        projectDetails.projectIntentCodeNode,
        intentCodeFullPath)

      // Delete file
      await fs.unlinkSync(intentCodeFullPath)
    }
  }

  async processFileDeltas(
    prisma: PrismaClient,
    buildData: BuildData,
    fileDeltas: FileDelta[]) {

    // Output
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.min) {

      // No changes?
      if (fileDeltas.length === 0) {

        console.log(`No changes to IntentCode`)
      } else {

        console.log(`${fileDeltas.length} IntentCode changes..`)
      }
    }

    // Iterate fileDeltas
    for (const fileDelta of fileDeltas) {

      // Process fileDelta
      await this.processFileDelta(
        prisma,
        buildData,
        fileDelta)
    }
  }
}
