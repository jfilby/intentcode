import { IntentError } from '@/core/errors.js'
import { createProjectStore } from '@/core/store.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'
import { BuildsGraphQueryService } from '@/services/graphs/builds/query-service.js'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const buildsGraphQueryService = new BuildsGraphQueryService()
const graphsDeleteService = new GraphsDeleteService()

// Class
export class DeleteBuildService {

  // Consts
  clName = 'DeleteBuildService'

  // Code
  /**
   * Each project holds its own graph, so each is opened and aged out on its
   * own rather than through the store of whichever project the build started
   * from.
   */
  async deleteOldBuildGraphs(
    projectsMap: Record<number, ProjectDetails>) {

    // Iterate projects
    for (const projectDetails of Object.values(projectsMap)) {

      // Delete old build graphs for the project
      await this.deleteOldBuildGraphsByProject(
        projectDetails)
    }
  }

  async deleteOldBuildGraphsByProject(
    projectDetails: ProjectDetails) {

    // Debug
    const fnName = `${this.clName}.deleteOldBuildGraphsByProject()`

    const store = createProjectStore(projectDetails.project.path)

    // Get project node
    const buildsNode = await
      buildsGraphQueryService.getBuildsNode(
        store,
        projectDetails.projectNode)

    // Validate
    if (buildsNode == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: buildNodes == null`,
        detail: `the project ${projectDetails.project.key} has no Builds node`
      })
    }

    // Get the build nodes to delete
    const buildNodes = await
      sourceNodeModel.getOldest(
        store,
        buildsNode.id,                     // parentId
        SourceNodeTypes.build,             // build nodes
        ServerOnlyTypes.oldBuildsToKeep)  // latestRecordsIgnored

    // Delete each node cascading
    for (const buildNode of buildNodes) {

      await graphsDeleteService.deleteSourceNodeCascade(
        store,
        buildNode.id,
        true)  // deleteThisNode
    }
  }
}
