import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class ProjectGraphQueryService {

  // Consts
  clName = 'ProjectGraphQueryService'

  // Code
  async getProjectNode(
          store: ProjectStore,
          projectId: string) {

    // Debug
    const fnName = `${this.clName}.getProjectNode()`

    // Try to get the node
    const projectNodes = await
            sourceNodeModel.filter(
              store,
              null,  // parentId
              projectId,
              SourceNodeTypes.project)

    // Validate
    if (projectNodes.length === 0) {
      return undefined

    } else if (projectNodes.length > 1) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: projectNodes.length > 1`,
        detail: `the project ${projectId} has ` +
          `${projectNodes.length} project nodes`
      })
    }

    // Return
    return projectNodes[0]
  }

  async getSourceProjectNode(
          store: ProjectStore,
          projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getSourceProjectNode()`

    // Validate
    if (projectNode.type !== SourceNodeTypes.project) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: projectNode.type !== SourceNodeTypes.project`
      })
    }

    // Get source node
    const sourceCodeProject = await
            sourceNodeModel.getByUniqueKey(
              store,
              projectNode.id,
              projectNode.projectId,
              SourceNodeTypes.projectSourceCode,
              SourceNodeNames.projectSourceCode)

    // Return
    return sourceCodeProject
  }
}
