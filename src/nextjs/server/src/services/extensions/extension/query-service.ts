import { PrismaClient, SourceNode } from '@prisma/client'
import { ExtensionsData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class ExtensionQueryService {

  // Consts
  clName = 'ExtensionQueryService'

  // Code
  async loadExtension(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: SourceNode) {

    // Get skills
    const skillNodes = await
            sourceNodeModel.filter(
              prisma,
              extensionNode.id,  // parentId
              instanceId,
              SourceNodeTypes.skillType)

    // Get hooks
    const hooksNodes = await
            sourceNodeModel.filter(
              prisma,
              extensionNode.id,  // parentId
              instanceId,
              SourceNodeTypes.hooksType)

    // Return
    return {
      extensionSkillNodes: skillNodes,
      extensionHooksNodes: hooksNodes
    }
  }

  async loadExtensions(
          prisma: PrismaClient,
          instanceId: string) {

    // Get the extensions node
    const extensionsNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              null,  // parentId
              instanceId,
              SourceNodeTypes.extensionsType,
              SourceNodeNames.extensionsName)

    if (extensionsNode == null) {
      return
    }

    // Get extensions
    const extensionNodes = await
            sourceNodeModel.filter(
              prisma,
              extensionsNode.id,  // parentId
              instanceId,
              SourceNodeTypes.extensionType)

    // Load extensions
    var skillNodes: SourceNode[] = []
    var hooksNodes: SourceNode[] = []

    for (const extensionNode of extensionNodes) {

      const { extensionSkillNodes, extensionHooksNodes } = await
        this.loadExtension(
          prisma,
          instanceId,
          extensionNode)

      skillNodes = skillNodes.concat(extensionSkillNodes)
      hooksNodes = hooksNodes.concat(extensionHooksNodes)
    }

    // Define ExtensionsData
    const extensionsData: ExtensionsData = {
      extensionNodes: extensionNodes,
      skillNodes: skillNodes,
      hooksNodes: hooksNodes
    }

    // Return
    return extensionsData
  }
}
