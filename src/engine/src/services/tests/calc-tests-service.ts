import { PrismaClient, UserProfile } from '@/prisma/client.js'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { ExtensionMutateService } from '../extensions/extension/mutate-service.js'
import { ExtensionQueryService } from '../extensions/extension/query-service.js'
import { PathsService } from '../utils/paths-service.js'
import { ProjectSetupService } from '../projects/setup-project.js'

// Services
const buildMutateService = new BuildMutateService()
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const pathsService = new PathsService()
const projectSetupService = new ProjectSetupService()

// Class
export class CalcTestsService {

  // Consts
  clName = 'CalcTestsService'

  // Code
  async tests(prisma: PrismaClient,
              regularTestUserProfile: UserProfile,
              adminUserProfile: UserProfile) {

    // Debug
    const fnName = `${this.clName}.tests()`

    // Get example's path
    const bundledPath = pathsService.getBundledPath()
    const projectPath = `${bundledPath}/examples/calc`

    // Initialize the project
    const { instance, projectNode, projectName } = await
      projectSetupService.initProject(
        prisma,
        projectPath,
        adminUserProfile)

    // Install required extension
    await extensionMutateService.loadExtensionsInSystemToUserProject(
      prisma,
      instance.id,
      [`intentcode/nodejs-typescript`])

    // Check expected extensions exist (loaded by the CLI)
    await extensionQueryService.checkExtensionsExist(
      prisma,
      instance.id,
      [`intentcode/nodejs-typescript`])

    // Recompile the project
    await buildMutateService.runBuild(
      prisma,
      instance.id,
      projectName)
  }
}
