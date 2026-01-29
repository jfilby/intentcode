import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class IntentCodeAnalysisGraphMutateService {

  // Consts
  clName = 'IntentCodeAnalysisGraphMutateService'

  // Code
  async getOrCreateProjectIntentCodeAnalysisNode(
    prisma: PrismaClient,
    buildNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSourceCodeProject()`

    // Validate
    if (buildNode == null) {
      throw new CustomError(`${fnName}: buildNode == null`)
    }

    if (buildNode.type !== SourceNodeTypes.build) {
      throw new CustomError(`${fnName}: invalid type: ${buildNode.type}`)
    }

    // Try to get the node
    var projectIntentCodeAnalysisNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            buildNode.id,  // parentId
            buildNode.instanceId,
            SourceNodeTypes.projectIntentCodeAnalysisNode,
            SourceNodeNames.projectIntentCodeAnalysisNode)

    if (projectIntentCodeAnalysisNode != null) {
      return projectIntentCodeAnalysisNode
    }

    // Create the node
    projectIntentCodeAnalysisNode = await
      sourceNodeModel.create(
        prisma,
        buildNode.id,  // parentId
        buildNode.instanceId,
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
    prisma: PrismaClient,
    projectIntentCodeAnalysisNode: SourceNode,
    suggestion: any) {

    // Debug
    const fnName = `${this.clName}.upsertSuggestion()`

    // Validate
    if (projectIntentCodeAnalysisNode == null) {
      throw new CustomError(`${fnName}: projectIntentCodeAnalysisNode == null`)
    }

    if (projectIntentCodeAnalysisNode.type !==
        SourceNodeTypes.projectIntentCodeAnalysisNode) {

      throw new CustomError(
        `${fnName}: invalid type: ${projectIntentCodeAnalysisNode.type}`)
    }

    if (suggestion == null) {
      throw new CustomError(`${fnName}: suggestion == null`)
    }

    if (suggestion.text == null) {
      throw new CustomError(`${fnName}: suggestion.text == null`)
    }

    // Create node
    const sourceNode = await
      sourceNodeModel.create(
        prisma,
        projectIntentCodeAnalysisNode.id,  // parentId
        projectIntentCodeAnalysisNode.instanceId,
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
