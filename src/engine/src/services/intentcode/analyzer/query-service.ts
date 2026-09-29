import type { ProjectStore } from '@/core/store.js'
import type { ProjectRecord } from '@/core/records.js'
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
    store: ProjectStore,
    project: ProjectRecord) {

    // Debug
    const fnName = `${this.clName}.getBuildInfo()`

    // Init BuildData
    const buildData = await
      buildMutateService.initBuildData(
        store,
        project.id)

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        project.id,
        buildData.projects)

    // Get buildFromFiles
    const buildFromFiles = await
      projectCompileService.getBuildFromFiles(store, projectDetails)

    // Return
    return {
      buildData,
      buildFromFiles,
      projectDetails
    }
  }
}
