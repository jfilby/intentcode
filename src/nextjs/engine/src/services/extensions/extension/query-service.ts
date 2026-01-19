const semver = require('semver')
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionsData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const projectsQueryService = new ProjectsQueryService()

// Class
export class ExtensionQueryService {

  // Consts
  clName = 'ExtensionQueryService'

  // Code
  async checkExtensionsExist(
          prisma: PrismaClient,
          instanceId: string,
          extensionIds: string[],
          verbose: boolean = false) {

    // Debug
    const fnName = `${this.clName}.checkExtensionsExist()`

    // Get extensions node
    const extensionsNode = await
            this.getExtensionsNode(
              prisma,
              instanceId)

    // Validate
    if (extensionsNode == null) {
      throw new CustomError(`${fnName}: extensionsNode == null`)
    }

    // Get extension nodes
    const extensionNodes = await
            sourceNodeModel.filter(
              prisma,
              extensionsNode.id)

    // List all loaded extensions if verbose
    if (verbose === true) {

      for (const extensionNode of extensionNodes) {

        console.log(`..${extensionNode.name} loaded`)
      }
    }

    // Ensure each extension id exists
    for (const extensionId of extensionIds) {

      var found = false

      for (const extensionNode of extensionNodes) {

        if (extensionNode.name === extensionId) {
          found = true
        }
      }

      if (found === false) {
        console.log(`Expected extension not found: ${extensionId}`)
        process.exit(1)
      }
    }

    // All found
    return true
  }

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

    // No extensions?
    if (extensionNodes.length === 0) {
      return null
    }

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

  async getExtension(
          prisma: PrismaClient,
          instanceId: string,
          extensionsNodeId: string,
          getName: string,
          getMinVersionNo: string) {

    // Debug
    const fnName = `${this.clName}.getExtension()`

    // console.log(
    //   `${fnName}: instanceId: ${instanceId} extensionsNodeId: ` +
    //   `${extensionsNodeId} getName: ${getName}`)

    // Get potential extension nodes
    const extensions = await
            sourceNodeModel.filter(
              prisma,
              extensionsNodeId,  // parentId
              instanceId,
              SourceNodeTypes.extensionType,
              getName)

    // Get semantic min version
    const minVersionNo = semver.minVersion(getMinVersionNo)

    // Get the highest version above minVersionNo
    var highestExtensionNode: any = undefined
    var highestVersionNo: string | undefined = undefined

    for (const extension of extensions) {

      // Debug
      // console.log(`${fnName}: trying: ` + JSON.stringify(extension))

      // Get the version no
      const versionNo = (extension as any).jsonContent.version

      // Validate
      if (versionNo == null) {
        throw new CustomError(`${fnName}: extension with SourceNode.id: ${extension.id} doesn't have a version set`)
      }

      // Is the version above the minimum required?
      if (semver.lt(
            versionNo,
            minVersionNo)) {

        continue
      }

      // Get if a higher version than the one already known
      if (highestVersionNo == null) {

        highestExtensionNode = extension
        highestVersionNo = versionNo
        continue
      }

      if (semver.gt(
            versionNo,
            highestVersionNo)) {

        highestExtensionNode = extension
        highestVersionNo = versionNo
      }
    }

    // Return
    return highestExtensionNode
  }

  async getExtensionNodes(
          prisma: PrismaClient,
          instanceId: string) {

    // Debug
    const fnName = `${this.clName}.getExtensionNodes()`

    // Get extensions node
    const extensionsNode = await
            this.getExtensionsNode(
              prisma,
              instanceId)

    // Get extensions
    const extensions = await
            sourceNodeModel.filter(
              prisma,
              extensionsNode.id,
              instanceId)

    // Return
    return extensions
  }

  async getExtensionsNode(
          prisma: PrismaClient,
          instanceId: string) {

    // Get extensions node
    const extensionsNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              null,  // parentId
              instanceId,
              SourceNodeTypes.extensionsType,
              SourceNodeNames.extensionsName)

    // Return
    return extensionsNode
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
            this.getExtensionsNode(
              prisma,
              instanceId)

    if (extensionsNode == null) {
      return
    }

    // Get extensions
    const extensionNodes = await
            sourceNodeModel.filter(
              prisma,
              extensionsNode.id,  // parentId
              instanceId,
              SourceNodeTypes.extensionType,
              undefined,
              undefined,
              undefined,
              true)       // orderByUniqueKey (for prompt reproducibility)

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

  async systemProjectExtensions(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.systemProjectExtensions()`

    // Get System project
    const systemProject = await
            projectsQueryService.getProject(
              prisma,
              ServerOnlyTypes.systemProjectName)

    // Validate
    if (systemProject == null) {
      throw new CustomError(`${fnName}: systemProject == null`)
    }

    // Get system extensions
    const extensionsData = await
            this.loadExtensions(
              prisma,
              systemProject.id)

    // Validate
    if (extensionsData == null) {
      throw new CustomError(`${fnName}: extensionsData == null`)
    }

    // Return
    return extensionsData
  }
}
