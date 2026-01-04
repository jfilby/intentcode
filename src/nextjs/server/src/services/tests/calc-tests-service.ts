import { PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
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

    // Get/create the project
    const instance = await
            projectsMutateService.getOrCreate(
              prisma,
              adminUserProfile.id,
              this.projectName)

    // Load bundled extension
    await loadExternalExtensionsService.loadPath(
            prisma,
            instance.id,
            `${process.env.BASE_DATA_PATH}/bundled-extensions`)

    // Setup the project
    const projectPath = `${process.env.LOCAL_TESTS_PATH}/calc`

    const intentCodeProjectNode = await
            projectSetupService.setupProject(
              prisma,
              instance,
              this.projectName,
              null,  // specsPath
              `${projectPath}/intent`,
              `${projectPath}/src`)

    // Recompile the project
    await buildMutateService.runBuild(
            prisma,
            instance.id,
            this.projectName)
  }
}
