import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient } from '@prisma/client'
import { BaseDataTypes } from '@/types/base-data-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { SourceNodeTypes } from '@/types/source-graph-types'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class ProjectGraphMutateService {

  // Consts
  clName = 'ProjectGraphMutateService'

  // Code
  async getOrCreateProject(
          prisma: PrismaClient,
          instanceId: string,
          projectName: string,
          projectPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateProject()`

    // Try to get the node
    var projectNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            instanceId,
            SourceNodeTypes.project,
            projectName)

    if (projectNode != null) {
      return projectNode
    }

    // Define jsonContent
    const jsonContent = {
      path: projectPath
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    projectNode = await
      sourceNodeModel.create(
        prisma,
        null,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.project,
        projectName,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

    // Return
    return projectNode
  }
}
