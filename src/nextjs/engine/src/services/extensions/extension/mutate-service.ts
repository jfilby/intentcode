import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient } from '@prisma/client'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ExtensionQueryService } from './query-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const extensionQueryService = new ExtensionQueryService()

// Class
export class ExtensionMutateService {

  // Consts
  clName = 'ExtensionMutateService'

  // Code
  async getOrSaveExtensionNode(
          prisma: PrismaClient,
          instanceId: string,
          extensionJson: any) {

    // Try to get the extensions node
    var extensionsNode = await
          extensionQueryService.getExtensionsNode(
            prisma,
            instanceId)

    if (extensionsNode == null) {

      // Create extensions node
      extensionsNode = await
        sourceNodeModel.create(
          prisma,
          null,  // parentId
          instanceId,
          BaseDataTypes.activeStatus,
          SourceNodeTypes.extensionsType,
          SourceNodeNames.extensionsName,
          null,
          null,
          null,
          null,
          null)
    }

    // Get jsonContentHash
    var extensionJsonHash: string | null = null

    if (extensionJson != null) {

      // Blake3 hash
      extensionJsonHash = blake3(JSON.stringify(extensionJson)).toString()
    }

    // Create the node
    const extensionNode = await
            sourceNodeModel.upsert(
              prisma,
              undefined,          // id
              extensionsNode.id,  // parentId
              instanceId,
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
