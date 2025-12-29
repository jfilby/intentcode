const fs = require('fs')
import { Instance, PrismaClient, SourceNode, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir'
import { fileExtToLanguageName } from '../../types/source-code-types'
import { CompilerMutateService } from '../intentcode/compiler/code/mutate-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { IndexerMutateService } from '../intentcode/indexer/mutate-service'
import { IntentCodeFilenameService } from '../utils/filename-service'
import { IntentCodeGraphMutateService } from '../graphs/intentcode/graph-mutate-service'
import { ProjectsMutateService } from '../projects/mutate-service'
import { SourceCodeGraphMutateService } from '../graphs/source-code/graph-mutate-service'

// Services
const compilerMutateService = new CompilerMutateService()
const fsUtilsService = new FsUtilsService()
const indexerMutateService = new IndexerMutateService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const projectsMutateService = new ProjectsMutateService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()
const walkDirService = new WalkDirService()

// Class
export class CalcTestsService {

  // Consts
  clName = 'CalcTestsService'

  projectName = `Calc`

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Get/create the project
    const instance = await
            projectsMutateService.getOrCreate(
              prisma,
              adminUserProfile.id,
              this.projectName)

    // Setup the project
    const intentCodeProjectNode = await
            this.setupProject(
              prisma,
              instance)

    // Recompile the project
    await this.runRecompileProject(
            prisma,
            intentCodeProjectNode)
  }

  async runRecompileProject(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.runRecompileProject()`

    // Purging old code and metadata to be done manually, but possibly detect
    // and warn if still present
    ;

    // Get IntentCode to compile
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            intentCodeProjectNode.path!,
            intentCodeList)

    // Compile
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

      // Get last save time of the file
      const fileModifiedTime = await
              fsUtilsService.getLastUpdateTime(intentCodeFilename)

      // Read file
      const intentCode = await
              fs.readFileSync(
                intentCodeFilename,
                { encoding: 'utf8', flag: 'r' })

      // Index the file
      await indexerMutateService.indexFileWithLlm(
              prisma,
              intentCodeProjectNode,
              intentCodeFilename,
              targetLang,
              intentCode,
              fileModifiedTime)

      // Compile IntentCode to source
      const compileResults = await
              compilerMutateService.run(
                prisma,
                intentCodeProjectNode,
                targetLang,
                intentCode)

      // Debug
      console.log(`${fnName}: compileResults: ` +
                  JSON.stringify(compileResults))
    }
  }

  async setupProject(
          prisma: PrismaClient,
          instance: Instance) {

    // Get/create IntentCode project
    const intentCodeProjectNode = await
            intentCodeGraphMutateService.getOrCreateIntentCodeProject(
              prisma,
              instance.id,
              this.projectName,
              `${process.env.LOCAL_TESTS_PATH}/calc/intent`)

    // Get/create source code project
    const sourceCodeProjectNode = await
            sourceCodeGraphMutateService.getOrCreateSourceCodeProject(
              prisma,
              instance.id,
              this.projectName,
              `${process.env.LOCAL_TESTS_PATH}/calc/src`)

    // Link the projets
    await intentCodeGraphMutateService.linkIntentCodeProjectToSourceCodeProject(
            prisma,
            intentCodeProjectNode,
            sourceCodeProjectNode)

    // Return
    return intentCodeProjectNode
  }
}
