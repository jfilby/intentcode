const fs = require('fs')
import { PrismaClient, UserProfile } from '@prisma/client'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir'
import { fileExtToLanguageName } from '../../types/source-code-types'
import { CodeMutateService } from '../intentcode/transpiler/code/mutate-service'
import { IntentCodeFilenameService } from '../intentcode/transpiler/code/filename-service'

// Services
const codeMutateService = new CodeMutateService()
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
    await this.runRetranspileProject(
            prisma,
            `${process.env.LOCAL_TESTS_PATH}/calc`)
  }

  async runRetranspileProject(
          prisma: PrismaClient,
          relativePath: string) {

    // Debug
    const fnName = `${this.clName}.runRetranspileProject()`

    // Purging old code and metadata to be done manually, but possibly detect
    // and warn if still present
    ;

    // Get intentcode to transpile
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            `${relativePath}/intent`,
            intentCodeList)

    // Transpile
    for (const intentCodeFilename of intentCodeList) {

      // Read file
      const intentcode = await
              fs.readFileSync(
                intentCodeFilename,
                { encoding: 'utf8', flag: 'r' })

      // Get the target file extension from the intentcode filename
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

      // Transpile intentcode -> source
      const results = await
              codeMutateService.run(
                prisma,
                targetLang,
                intentcode)

      // Debug
      console.log(`${fnName}: results: ` + JSON.stringify(results))
    }
  }
}
