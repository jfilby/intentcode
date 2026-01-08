import path from 'path'
import { Instance, PrismaClient } from '@prisma/client'
import { IntentCodeGraphMutateService } from '../graphs/intentcode/graph-mutate-service'
import { ProjectGraphMutateService } from '../graphs/project/mutate-service'
import { SourceCodeGraphMutateService } from '../graphs/source-code/graph-mutate-service'

// Services
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const projectGraphMutateService = new ProjectGraphMutateService()
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
          projectPath: string) {

    // Get/create project node
    const projectNode = await
            projectGraphMutateService.getOrCreateProject(
              prisma,
              instance.id,
              projectName,
              projectPath)

    // Infer other paths
    const intentPath = `${projectPath}${path.sep}intent`
    const srcPath = `${projectPath}${path.sep}src`

    // Get/create IntentCode project node
    const intentCodeProjectNode = await
            intentCodeGraphMutateService.getOrCreateIntentCodeProject(
              prisma,
              projectNode,
              intentPath)

    // Get/create source code project node
    const sourceCodeProjectNode = await
            sourceCodeGraphMutateService.getOrCreateSourceCodeProject(
              prisma,
              projectNode,
              srcPath)

    // Return
    return projectNode
  }
}
