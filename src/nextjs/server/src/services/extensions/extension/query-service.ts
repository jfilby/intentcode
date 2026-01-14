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
  async getAsPrompting(
          prisma: PrismaClient,
          instanceId: string) {

    // Get all extensions with their hooks for the instance
    const extensionNodes = await
            sourceNodeModel.filterWithChildNodes(
              prisma,
              instanceId,
              SourceNodeTypes.extensionType,
              [SourceNodeTypes.hooksType])

    // Generate prompting
    var prompting = ``

    // Iterate extension nodes
    for (const extensionNode of extensionNodes) {

      if (extensionNode.jsonContent == null) {
        continue
      }

      const extensionJsonContent = extensionNode.jsonContent as any

      prompting +=
        `### Extension id: ${extensionJsonContent.id}\n` +
        `\n` +
        `Name: ${extensionJsonContent.name}` +
        `Version: ${extensionJsonContent.version}` +
        `\n`

      // Iterate hook nodes
      for (const hookNode of extensionNode.children) {

        if (hookNode.jsonContent == null) {
          continue
        }

        const hookJsonContent = hookNode.jsonContent as any

        prompting +=
          `#### Hook: ${hookJsonContent.name}\n` +
          `\n` +
          JSON.stringify(hookJsonContent) +
          `\n`
      }
    }

    // Return
    return prompting
  }

  async loadExtension(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: SourceNode,
          withSkills: boolean = true,
          withHooks: boolean = true) {

    // Get skills
    var skillNodes: SourceNode[] = []

    if (withSkills === true) {

      skillNodes = await
        sourceNodeModel.filter(
          prisma,
          extensionNode.id,  // parentId
          instanceId,
          SourceNodeTypes.skillType)
    }

    // Get hooks
    var hooksNodes: SourceNode[] = []

    if (withHooks === true) {

      hooksNodes = await
        sourceNodeModel.filter(
          prisma,
          extensionNode.id,  // parentId
          instanceId,
          SourceNodeTypes.hooksType)
    }

    // Return
    return {
      extensionSkillNodes: skillNodes,
      extensionHooksNodes: hooksNodes
    }
  }

  async loadExtensions(
          prisma: PrismaClient,
          instanceId: string,
          withSkills: boolean = true,
          withHooks: boolean = true) {

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
          extensionNode,
          withSkills,
          withHooks)

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
