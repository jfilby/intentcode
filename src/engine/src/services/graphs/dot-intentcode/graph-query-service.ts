import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class DotIntentCodeGraphQueryService {

  // Consts
  clName = 'DotIntentCodeGraphQueryService'

  // Code
  async getDotIntentCodeProject(
          store: ProjectStore,
          projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getDotIntentCodeProject()`

    // Get the node
    var projectDotIntentCodeNode = await
          sourceNodeModel.getByUniqueKey(
            store,
            projectNode.id,  // parentId
            projectNode.projectId,
            SourceNodeTypes.projectDotIntentCode,
            SourceNodeNames.projectDotIntentCode)

    // Return
    return projectDotIntentCodeNode
  }
}
