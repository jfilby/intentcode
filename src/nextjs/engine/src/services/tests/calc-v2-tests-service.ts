import { PrismaClient, UserProfile } from '@prisma/client'
import { BuildMutateService } from '../intentcode/build/mutate-service'
import { ExtensionQueryService } from '../extensions/extension/query-service'
import { ProjectsMutateService } from '../projects/mutate-service'
import { ProjectSetupService } from '../projects/setup-project'

// Services
const buildMutateService = new BuildMutateService()
const extensionQueryService = new ExtensionQueryService()
const projectsMutateService = new ProjectsMutateService()
const projectSetupService = new ProjectSetupService()

// Class
export class CalcV2TestsService {

  // Consts
  clName = 'CalcV2TestsService'

  projectName = `Calc v2`

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Debug
    const fnName = `${this.clName}.tests()`

    // Get/create the project
    const instance = await
            projectsMutateService.getOrCreate(
              prisma,
              adminUserProfile.id,
              this.projectName)

    // Setup the project
    const projectPath = `${process.env.LOCAL_TESTS_PATH}/calc-v2`

    const projectNode = await
            projectSetupService.setupProject(
              prisma,
              instance,
              this.projectName,
              projectPath)

    /* Check expected extensions exist (loaded by the CLI)
    await extensionQueryService.checkExtensionsExist(
            prisma,
            instance.id,
            [`intentcode/nodejs-typescript`],
            true)  // verbose */

    // Recompile the project
    await buildMutateService.runBuild(
            prisma,
            instance.id,
            this.projectName)
  }
}
