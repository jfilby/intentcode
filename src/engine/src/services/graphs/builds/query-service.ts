import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class BuildsGraphQueryService {

  // Consts
  clName = 'BuildsGraphQueryService'

  // Code
  async getBuildsNode(
    store: ProjectStore,
    projectNode: SourceNodeRecord) {

    // Get the node
    const buildsNode = await
          sourceNodeModel.getByUniqueKey(
            store,
            projectNode.id,  // parentId
            projectNode.projectId,
            SourceNodeTypes.builds,
            SourceNodeNames.builds)

    // Return
    return buildsNode
  }
}
