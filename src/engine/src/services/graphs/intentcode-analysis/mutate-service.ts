import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class IntentCodeAnalysisGraphMutateService {

  // Consts
  clName = 'IntentCodeAnalysisGraphMutateService'

  // Code
  async getOrCreateProjectIntentCodeAnalysisNode(
    store: ProjectStore,
    buildNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodeProject()`

    // Validate
    if (buildNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: buildNode == null`
      })
    }

    if (buildNode.type !== SourceNodeTypes.build) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${buildNode.type}`
      })
    }

    // Try to get the node
    let projectIntentCodeAnalysisNode = await
          sourceNodeModel.getByUniqueKey(
            store,
            buildNode.id,  // parentId
            buildNode.projectId,
            SourceNodeTypes.projectIntentCodeAnalysisNode,
            SourceNodeNames.projectIntentCodeAnalysisNode)

    if (projectIntentCodeAnalysisNode != null) {
      return projectIntentCodeAnalysisNode
    }

    // Create the node
    projectIntentCodeAnalysisNode = await
      sourceNodeModel.create(
        store,
        buildNode.id,  // parentId
        buildNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.projectIntentCodeAnalysisNode,
        SourceNodeNames.projectIntentCodeAnalysisNode,
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return projectIntentCodeAnalysisNode
  }

  async upsertSuggestion(
    store: ProjectStore,
    projectIntentCodeAnalysisNode: SourceNodeRecord,
    suggestion: { text?: string } | null) {

    // Debug
    const fnName = `${this.clName}.upsertSuggestion()`

    // Validate
    if (projectIntentCodeAnalysisNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: projectIntentCodeAnalysisNode == null`
      })
    }

    if (projectIntentCodeAnalysisNode.type !==
        SourceNodeTypes.projectIntentCodeAnalysisNode) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ` +
          `${projectIntentCodeAnalysisNode.type}`
      })
    }

    if (suggestion == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: suggestion == null`
      })
    }

    if (suggestion.text == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: suggestion.text == null`
      })
    }

    // Create node
    const sourceNode = await
      sourceNodeModel.create(
        store,
        projectIntentCodeAnalysisNode.id,  // parentId
        projectIntentCodeAnalysisNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.suggestion,
        suggestion.text,
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return sourceNode
  }
}
