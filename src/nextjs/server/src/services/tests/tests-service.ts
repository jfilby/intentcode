const fs = require('fs')
import { PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir'
import { fileExtToLanguageName } from '../../types/source-code-types'
import { CompilerMutateService } from '../intentcode/compiler/code/mutate-service'
import { IntentCodeFilenameService } from '../utils/filename-service'
import { IndexerMutateService } from '../intentcode/indexer/mutate-service'

// Services
const compilerMutateService = new CompilerMutateService()
const indexerMutateService = new IndexerMutateService()
const intentCodeFilenameService = new IntentCodeFilenameService()
const walkDirService = new WalkDirService()

// Class
export class TestsService {

  // Consts
  clName = 'TestsService'

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Run the calc test
    await this.runRecompileProject(
            prisma,
            `${process.env.LOCAL_TESTS_PATH}/calc`)
  }

  async runRecompileProject(
          prisma: PrismaClient,
          relativePath: string) {

    // Debug
    const fnName = `${this.clName}.runRecompileProject()`

    // Purging old code and metadata to be done manually, but possibly detect
    // and warn if still present
    ;

    // Get IntentCode to compile
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            `${relativePath}/intent`,
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

      // Read file
      const intentCode = await
              fs.readFileSync(
                intentCodeFilename,
                { encoding: 'utf8', flag: 'r' })

      // Index the file
      const indexResults = await
              indexerMutateService.indexFileWithLlm(
                prisma,
                targetLang,
                intentCode)

      // Debug
      console.log(`${fnName}: indexResults: ` + JSON.stringify(indexResults))

      // TEST STOP
      throw new CustomError(`${fnName}: TEST STOP`)

      // Compile intentcode -> source
      const compileResults = await
              compilerMutateService.run(
                prisma,
                targetLang,
                intentCode)

      // Debug
      console.log(`${fnName}: compileResults: ` +
                  JSON.stringify(compileResults))
    }
  }
}
