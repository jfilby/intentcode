import { PrismaClient, UserProfile } from '@prisma/client'
import { BuildMutateService } from '../intentcode/build/mutate-service'
import { ExtensionQueryService } from '../extensions/extension/query-service'
import { ProjectSetupService } from '../projects/setup-project'

// Services
const buildMutateService = new BuildMutateService()
const extensionQueryService = new ExtensionQueryService()
const projectSetupService = new ProjectSetupService()

// Class
export class CalcV2TestsService {

  // Consts
  clName = 'CalcV2TestsService'

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Debug
    const fnName = `${this.clName}.tests()`

    // Initialize the project
    const projectPath = `${process.env.LOCAL_TESTS_PATH}/calc-v2`

    const { instance, projectNode, projectName } = await
            projectSetupService.initProject(
              prisma,
              projectPath,
              adminUserProfile)

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
            projectName)
  }
}
