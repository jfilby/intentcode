import { blake3 } from '@noble/hashes/blake3'
import { Instance, PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ExtensionQueryService } from './query-service'
import { GraphsMutateService } from '@/services/graphs/general/mutate-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Models
const instanceModel = new InstanceModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const extensionQueryService = new ExtensionQueryService()
const graphsMutateService = new GraphsMutateService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class ExtensionMutateService {

  // Consts
  clName = 'ExtensionMutateService'

  // Code
  async getOrCreateExtensionsNode(
          prisma: PrismaClient,
          instanceId: string) {

    // Try to get the extensions node
    var extensionsNode = await
          extensionQueryService.getExtensionsNode(
            prisma,
            instanceId)

    if (extensionsNode != null) {
      return extensionsNode
    }

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

    // Return
    return extensionsNode
  }

  async getOrSaveExtensionNode(
          prisma: PrismaClient,
          instanceId: string,
          extensionsNodeId: string,
          extensionJson: any) {

    // Get jsonContentHash
    var extensionJsonHash: string | null = null

    if (extensionJson != null) {
      extensionJsonHash = blake3(JSON.stringify(extensionJson)).toString()
    }

    // Create the node
    const extensionNode = await
            sourceNodeModel.upsert(
              prisma,
              undefined,          // id
              extensionsNodeId,   // parentId
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

  async loadExtensionsInSystemToUserProject(
    prisma: PrismaClient,
    loadToInstanceId: string,
    extensionNames: string[]) {

    // Debug
    const fnName = `${this.clName}.loadExtensionsInSystemToUserProject()`

    // Get the System project
    const systemProject = await
            projectsQueryService.getProject(
              prisma,
              null,  // parentId
              ServerOnlyTypes.systemProjectName)

    // Validate
    if (systemProject == null) {
      console.error(`System project not found (run setup)`)
      return
    }

    // Get all extensions in System
    const extensionNodes = await
      extensionQueryService.getExtensionNodes(
        prisma,
        systemProject.id)

    // Get the toExtensions node
    const toExtensionsNode = await
      extensionQueryService.getExtensionsNode(
        prisma,
        loadToInstanceId)

    // Load the requested extensions
    for (const extensionNode of extensionNodes) {

      // Debug
      // console.log(`${fnName}: extension: ` + JSON.stringify(extension))

      // Add to extensions
      if (extensionNames.includes(extensionNode.name)) {

      // Load the Extension into the selected instance
      await graphsMutateService.copyNodesToProject(
              prisma,
              systemProject.id,
              loadToInstanceId,
              extensionNode.id,
              toExtensionsNode.id)  // parentToNodeId
      }
    }
  }

  async loadExtensionNodesInSystemToUserProject(
          prisma: PrismaClient,
          loadToInstanceId: string,
          extensions: any) {

    // Debug
    const fnName = `${this.clName}.loadExtensionNodesInSystemToUserProject()`

    // Get the System project
    const systemProject = await
            projectsQueryService.getProject(
              prisma,
              null,  // parentId
              ServerOnlyTypes.systemProjectName)

    // Validate
    if (systemProject == null) {
      console.error(`System project not found (run setup)`)
      return
    }

    // Get the system project node
    const systemExtensionsNode = await
            extensionQueryService.getExtensionsNode(
              prisma,
              systemProject.id)

    // Validate
    if (systemExtensionsNode == null) {
      console.error(`System extensions node not found (run setup)`)
      return
    }

    // Get/create user project extensions node
    const extensionsNode = await
            this.getOrCreateExtensionsNode(
              prisma,
              loadToInstanceId)

    // Iterate and load extensions
    for (const [loadName, loadMinVersionNo] of Object.entries(extensions)) {

      // Try to get the extension in the System instance
      const extensionNode = await
              extensionQueryService.getExtension(
                prisma,
                systemProject.id,
                systemExtensionsNode.id,
                loadName,
                loadMinVersionNo as string)

      // Validate
      if (extensionNode == null) {

        console.log(
          `Extension ${loadName}: ${loadMinVersionNo} not found in System ` +
          `(load the extension first)`)

        process.exit(1)
      }

      // Load the Extension into the selected instance
      await graphsMutateService.copyNodesToProject(
              prisma,
              systemProject.id,
              loadToInstanceId,
              extensionNode.id,
              extensionsNode.id)  // parentToNodeId
    }
  }

  async upgradeToUserProject(
    prisma: PrismaClient,
    userProject: Instance,
    systemExtensionNode: any) {

    // Debug
    const fnName = `${this.clName}.upgradeToUserProject()`

    // Get extensions node
    const extensionsNode = await
      extensionQueryService.getExtensionsNode(
        prisma,
        userProject.id)

    // Validate
    if (extensionsNode == null) {
      throw new CustomError(`${fnName}: extensionsNode == null`)
    }

    // Does the extension already exist in the user project?
    var extensionNode = await
      sourceNodeModel.getByUniqueKey(
        prisma,
        extensionsNode.id,
        userProject.id,
        SourceNodeTypes.extensionType,
        systemExtensionNode.name)

    // Don't proceed if the user project's extension doesn't exist
    if (extensionNode == null) {
      return false
    }

    // Upgrading output
    console.log(
      `Upgrading extension: ${systemExtensionNode.name} to project: ` +
      `${userProject.name}`)

    // Load the Extension into the user project
    await graphsMutateService.copyNodesToProject(
      prisma,
      systemExtensionNode.instanceId,
      userProject.id,
      systemExtensionNode.id,
      extensionsNode.id)  // parentToNodeId

    // Return
    return true
  }

  async upgradeToUserProjects(
    prisma: PrismaClient,
    extensionNodes: any[]) {

    // Get user projects
    const instances = await
      instanceModel.filter(prisma)

    // Per user project/extensionNode
    var copyCount = 0

    for (const instance of instances) {

      // Skip System project
      if (instance.name === ServerOnlyTypes.systemProjectName) {
        continue
      }

      // Per extensionNode
      for (const extensionNode of extensionNodes) {

        const copied = await
          this.upgradeToUserProject(
            prisma,
            instance,
            extensionNode)

        if (copied === true) {
          copyCount += 1
        }
      }
    }

    // Return
    return copyCount
  }
}
