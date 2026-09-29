import { blake3 } from '@noble/hashes/blake3'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class ProjectGraphMutateService {

  // Consts
  clName = 'ProjectGraphMutateService'

  // Code
  async getOrCreateProject(
          store: ProjectStore,
          projectId: string,
          projectName: string,
          projectPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateProject()`

    // Try to get the node
    var projectNode = await
          sourceNodeModel.getByUniqueKey(
            store,
            null,  // parentId
            projectId,
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
        store,
        null,  // parentId
        projectId,
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
