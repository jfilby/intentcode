import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildData } from '@/types/build-types'
import { ProjectsQueryService } from '@/services/projects/query-service'
import { TechStackQueryService } from './query-service'

// Services
const projectsQueryService = new ProjectsQueryService()
const techStackQueryService = new TechStackQueryService()

// Class
export class TechStackVerifyService {

  // Consts
  clName = 'TechStackVerifyService'

  // Code
  async verify(
    prisma: PrismaClient,
    buildData: BuildData,
    projectNode: SourceNode) {

    // Get ProjectDetails
    const projectDetails =
            projectsQueryService.getProjectDetailsByInstanceId(
              projectNode.instanceId,
              buildData.projects)

    // Get tech-stack filename
    const { intentCodePath, techStackFilename } = await
      techStackQueryService.getFilename(projectDetails)
  }
}
