import { CustomError } from 'serene-core-server'
import { Instance, PrismaClient } from '@/prisma/client.js'
import { BuildMutateService } from '../build/mutate-service.js'
import { ProjectCompileService } from '@/services/projects/compile-service.js'
import { ProjectsQueryService } from '@/services/projects/query-service.js'

// Services
const buildMutateService = new BuildMutateService()
const projectCompileService = new ProjectCompileService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class IntentCodeAnalyzerQueryService {

  // Consts
  clName = 'IntentCodeAnalyzerQueryService'

  // Code
  async getBuildInfo(
    prisma: PrismaClient,
    instance: Instance) {

    // Debug
    const fnName = `${this.clName}.getBuildInfo()`

    // Init BuildData
    const buildData = await
      buildMutateService.initBuildData(
        prisma,
        instance.id)

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByInstanceId(
        instance.id,
        buildData.projects)

    // Debug
    // console.log(`${fnName}: projectDetails: ` + JSON.stringify(projectDetails))

    // Validate
    if (projectDetails == null) {
      throw new CustomError(`${fnName}: projectDetails == null`)
    }

    // Get buildFromFiles
    const buildFromFiles = await
      projectCompileService.getBuildFromFiles(projectDetails)

    // Return
    return {
      buildData,
      buildFromFiles,
      projectDetails
    }
  }
}
