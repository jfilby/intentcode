import { blake3 } from '@noble/hashes/blake3'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ExtensionQueryService } from './query-service.js'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service.js'

/** An `extension.json` file: an id, plus whatever else the extension says. */
type ExtensionJson = {
  id?: string
  [key: string]: unknown
}

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const extensionQueryService = new ExtensionQueryService()
const graphsDeleteService = new GraphsDeleteService()

// Class
export class ExtensionMutateService {

  // Consts
  clName = 'ExtensionMutateService'

  // Code
  async deleteExtension(
    store: ProjectStore,
    extensionNodeId: string) {

    await graphsDeleteService.deleteSourceNodeCascade(
      store,
      extensionNodeId,
      true)  // deleteThisNode
  }

  async getOrCreateExtensionsNode(
          store: ProjectStore,
          projectId: string) {

    // Try to get the extensions node
    let extensionsNode = await
          extensionQueryService.getExtensionsNode(
            store,
            projectId)

    if (extensionsNode != null) {
      return extensionsNode
    }

    // Create extensions node
    extensionsNode = await
      sourceNodeModel.create(
        store,
        null,  // parentId
        projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.extensionsType,
        SourceNodeNames.extensionsName,
        null,
        null,
        null,
        null,
        null)

    // Return
    return extensionsNode
  }

  async getOrSaveExtensionNode(
          store: ProjectStore,
          projectId: string,
          extensionsNodeId: string,
          extensionJson: ExtensionJson) {

    // Get jsonContentHash
    let extensionJsonHash: string | null = null

    if (extensionJson != null) {
      extensionJsonHash = blake3(JSON.stringify(extensionJson)).toString()
    }

    // Create the node
    const extensionNode = await
            sourceNodeModel.upsert(
              store,
              undefined,          // id
              extensionsNodeId,   // parentId
              projectId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.extensionType,
              extensionJson.id,
              null,               // content
              null,               // contentHash
              extensionJson,      // jsonContent
              extensionJsonHash,  // jsonContentHash
              null)               // contentUpdated

    // Return
    return extensionNode
  }

}
