import { ProjectStore } from '@/core/store.js'
import { SourceNodeRecord } from '@/core/records.js'
import { BuildData } from '@/types/build-types.js'
import { ProjectsQueryService } from '@/services/projects/query-service.js'
import { TechStackQueryService } from './query-service.js'

// Services
const projectsQueryService = new ProjectsQueryService()
const techStackQueryService = new TechStackQueryService()

// Class
export class TechStackVerifyService {

  // Consts
  clName = 'TechStackVerifyService'

  // Code
  async verify(
    store: ProjectStore,
    buildData: BuildData,
    projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.verify()`

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        projectNode.projectId,
        buildData.projects)

    // Get tech-stack filename
    const { intentCodePath, techStackFilename } = await
      techStackQueryService.getFilename(projectDetails)
  }
}
