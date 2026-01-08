import { PrismaClient, UserProfile } from '@prisma/client'
import { BuildMutateService } from '../intentcode/build/mutate-service'
import { LoadExternalExtensionsService } from '../extensions/extension/load-external-service'
import { ProjectsMutateService } from '../projects/mutate-service'
import { ProjectSetupService } from '../projects/setup-project'

// Services
const buildMutateService = new BuildMutateService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const projectsMutateService = new ProjectsMutateService()
const projectSetupService = new ProjectSetupService()

// Class
export class CalcTestsService {

  // Consts
  clName = 'CalcTestsService'

  projectName = `Calc`

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
    const projectPath = `${process.env.LOCAL_TESTS_PATH}/calc`

    const projectNode = await
            projectSetupService.setupProject(
              prisma,
              instance,
              this.projectName,
              projectPath)

    // Load bundled extension (must be done after the project is created)
    await loadExternalExtensionsService.loadPath(
            prisma,
            instance.id,
            `${process.env.BASE_DATA_PATH}/bundled-extensions`)

    // Recompile the project
    await buildMutateService.runBuild(
            prisma,
            instance.id,
            this.projectName)
  }
}
