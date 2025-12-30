import { Instance, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { IntentCodeGraphMutateService } from '../graphs/intentcode/graph-mutate-service'
import { SourceCodeGraphMutateService } from '../graphs/source-code/graph-mutate-service'

// Services
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()

// Class
export class ProjectSetupService {

  // Consts
  clName = 'ProjectSetupService'

  // Code
  async setupProject(
          prisma: PrismaClient,
          instance: Instance,
          projectName: string,
          specsPath: string | null,
          intentPath: string,
          srcPath: string) {

    // Get/create IntentCode project
    const intentCodeProjectNode = await
            intentCodeGraphMutateService.getOrCreateIntentCodeProject(
              prisma,
              instance.id,
              projectName,
              intentPath)

    // Get/create source code project
    const sourceCodeProjectNode = await
            sourceCodeGraphMutateService.getOrCreateSourceCodeProject(
              prisma,
              instance.id,
              projectName,
              srcPath)

    // Link the projets
    await intentCodeGraphMutateService.linkIntentCodeProjectToSourceCodeProject(
            prisma,
            intentCodeProjectNode,
            sourceCodeProjectNode)

    // Return
    return intentCodeProjectNode
  }
}
