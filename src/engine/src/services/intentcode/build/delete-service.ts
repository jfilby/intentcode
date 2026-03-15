import { CustomError } from 'serene-core-server'
import { PrismaClient } from '@/prisma/client.js'
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
  async deleteOldBuildGraphs(
    prisma: PrismaClient,
    projectsMap: Record<number, ProjectDetails>) {

    // Iterate projects
    for (const projectDetails of Object.values(projectsMap)) {

      // Delete old build graphs for the project
      await this.deleteOldBuildGraphsByProject(
        prisma,
        projectDetails)
    }
  }

  async deleteOldBuildGraphsByProject(
    prisma: PrismaClient,
    projectDetails: ProjectDetails) {

    // Debug
    const fnName = `${this.clName}.deleteOldBuildGraphsByProject()`

    // Get project node
    const buildsNode = await
      buildsGraphQueryService.getBuildsNode(
        prisma,
        projectDetails.projectNode)

    // Validate
    if (buildsNode == null) {
      throw new CustomError(`${fnName}: buildNodes == null`)
    }

    // Get the build nodes to delete
    const buildNodes = await
      sourceNodeModel.getOldest(
        prisma,
        buildsNode.id,                     // parentId
        SourceNodeTypes.build,             // build nodes
        ServerOnlyTypes.oldBuildsToKeep)  // latestRecordsIgnored

    // Delete each node cascading
    for (const buildNode of buildNodes) {

      await graphsDeleteService.deleteSourceNodeCascade(
        prisma,
        buildNode.id,
        true)  // deleteThisNode
    }
  }
}
