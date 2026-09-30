import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class SpecsGraphQueryService {

  // Consts
  clName = 'SpecsGraphQueryService'

  // Code
  async getSpecsProjectNode(
          store: ProjectStore,
          projectNode: SourceNodeRecord) {

    // Get the node
    const specsProjectNode = await
          sourceNodeModel.getByUniqueKey(
            store,
            projectNode.id,  // parentId
            projectNode.projectId,
            SourceNodeTypes.projectSpecs,
            SourceNodeNames.projectSpecs)

    // Return
    return specsProjectNode
  }
}
