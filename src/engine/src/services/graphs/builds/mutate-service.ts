import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class BuildsGraphMutateService {

  // Consts
  clName = 'BuildsGraphMutateService'

  // Code
  async getOrCreateBuildsNode(
    store: ProjectStore,
    projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getOrCreateBuildsNode()`

    // Validate
    if (projectNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (projectNode.type !== SourceNodeTypes.project) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${projectNode.type}`
      })
    }

    // Try to get the builds node
    let buildsNode = await
      sourceNodeModel.getByUniqueKey(
        store,
        projectNode.id,
        projectNode.projectId,
        SourceNodeTypes.builds,
        SourceNodeNames.builds)

    if (buildsNode != null) {
      return buildsNode
    }

    // Create a builds node
    buildsNode = await
      sourceNodeModel.create(
        store,
        projectNode.id,
        projectNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.builds,
        SourceNodeNames.builds,
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return buildsNode
  }

  async createBuildNode(
    store: ProjectStore,
    buildsNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getOrCreateBuildsNode()`

    // Validate
    if (buildsNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (buildsNode.type !== SourceNodeTypes.builds) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${buildsNode.type}`
      })
    }

    // Create a build node
    const buildNode = await
      sourceNodeModel.create(
        store,
        buildsNode.id,
        buildsNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.build,
        new Date().toISOString(),  // name
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return buildNode
  }
}
