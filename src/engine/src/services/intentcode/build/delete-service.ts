import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'
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
   * Ages out the builds a project is keeping past its newest few, each with
   * the source subtree it grew.
   *
   * This runs on the build's own store. A project's graph is one file with one
   * writer: the build holds records it read earlier and writes them back
   * further on, so a second store reading and writing that file behind the
   * build's back drops records the build is still holding, and the next write
   * of one of them fails on a record that is no longer there.
   */
  async deleteOldBuildGraphs(
    store: ProjectStore,
    projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.deleteOldBuildGraphs()`

    // Get project node
    const buildsNode = await
      buildsGraphQueryService.getBuildsNode(
        store,
        projectNode)

    // Validate
    if (buildsNode == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: buildNodes == null`,
        detail: `the project ${projectNode.projectId} has no Builds node`
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
