import { PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ProjectsMutateService } from '../projects/mutate-service'
import { ProjectCompileService } from '../projects/compile-service'
import { ProjectSetupService } from '../projects/setup-project'

// Services
const projectsMutateService = new ProjectsMutateService()
const projectCompileService = new ProjectCompileService()
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
    await projectCompileService.runRecompileProject(
            prisma,
            intentCodeProjectNode)
  }
}
