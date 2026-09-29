import { blake3 } from '@noble/hashes/blake3'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ExtensionQueryService } from './query-service.js'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service.js'
import { GraphsMutateService } from '@/services/graphs/general/mutate-service.js'
import { ProjectRegistryService } from '@/services/projects/project-registry.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const extensionQueryService = new ExtensionQueryService()
const graphsDeleteService = new GraphsDeleteService()
const graphsMutateService = new GraphsMutateService()
const projectRegistryService = new ProjectRegistryService()

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
    var extensionsNode = await
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
          extensionJson: any) {

    // Get jsonContentHash
    var extensionJsonHash: string | null = null

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

  /**
   * Copies named extensions out of the System project, which is where the
   * bundled ones live, into a user project. The two are separate stores, so
   * both are named: reading the source graph and writing the target graph are
   * not the same operation against the same files.
   */
  async loadExtensionsInSystemToUserProject(
    systemStore: ProjectStore,
    userStore: ProjectStore,
    loadToProjectId: string,
    extensionNames: string[]) {

    // Debug
    const fnName = `${this.clName}.loadExtensionsInSystemToUserProject()`

    // Get all extensions in System
    const extensionNodes = await
      extensionQueryService.getExtensionNodes(
        systemStore,
        projectRegistryService.getSystemProject().id)

    // Get the toExtensions node
    const toExtensionsNode = await
      extensionQueryService.getExtensionsNode(
        userStore,
        loadToProjectId)

    // Validate
    if (toExtensionsNode == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'toExtensionsNode == null'
      })
    }

    // Load the requested extensions
    for (const extensionNode of extensionNodes) {

      // Debug
      // console.log(`${fnName}: extension: ` + JSON.stringify(extension))

      // Add to extensions
      if (extensionNames.includes(extensionNode.name)) {

      // Load the Extension into the selected project
      await graphsMutateService.copyNodesToProject(
              systemStore,
              userStore,
              loadToProjectId,
              extensionNode.id,
              toExtensionsNode.id)  // parentToNodeId
      }
    }
  }

  /**
   * Copies the named extensions out of the System project into a user project,
   * taking the versions the project's deps file asks for rather than the ones
   * named.
   */
  async loadExtensionNodesInSystemToUserProject(
          systemStore: ProjectStore,
          userStore: ProjectStore,
          loadToProjectId: string,
          extensions: any) {

    // Debug
    const fnName = `${this.clName}.loadExtensionNodesInSystemToUserProject()`

    // Get the System project
    const systemProject = projectRegistryService.getSystemProject()

    // Get the system project node
    const systemExtensionsNode = await
            extensionQueryService.getExtensionsNode(
              systemStore,
              systemProject.id)

    // Validate
    if (systemExtensionsNode == null) {
      console.error(`System extensions node not found (run setup)`)
      return
    }

    // Get/create user project extensions node
    const extensionsNode = await
            this.getOrCreateExtensionsNode(
              userStore,
              loadToProjectId)

    // Iterate and load extensions
    for (const [loadName, loadMinVersionNo] of Object.entries(extensions)) {

      // Try to get the extension in the System project
      const extensionNode = await
              extensionQueryService.getExtension(
                systemStore,
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

      // Load the Extension into the selected project
      await graphsMutateService.copyNodesToProject(
              systemStore,
              userStore,
              loadToProjectId,
              extensionNode.id,
              extensionsNode.id)  // parentToNodeId
    }
  }

  /**
   * Copies one extension node, held in `store`, into a user project. The
   * extension is only copied when the project already has an extension of that
   * name: an upgrade brings a pinned version forward, it does not add an
   * extension the project never asked for.
   */
  async upgradeToUserProject(
    store: ProjectStore,
    userStore: ProjectStore,
    userProject: ProjectRecord,
    sourceExtensionNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.upgradeToUserProject()`

    // Get extensions node
    const extensionsNode = await
      extensionQueryService.getExtensionsNode(
        userStore,
        userProject.id)

    // Validate
    if (extensionsNode == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsNode == null'
      })
    }

    // Does the extension already exist in the user project?
    var extensionNode = await
      sourceNodeModel.getByUniqueKey(
        userStore,
        extensionsNode.id,
        userProject.id,
        SourceNodeTypes.extensionType,
        sourceExtensionNode.name)

    // Don't proceed if the user project's extension doesn't exist
    if (extensionNode == null) {
      return false
    }

    // Upgrading output
    console.log(
      `Upgrading extension: ${sourceExtensionNode.name} to project: ` +
      `${userProject.name}`)

    // Load the Extension into the user project
    await graphsMutateService.copyNodesToProject(
      store,
      userStore,
      userProject.id,
      sourceExtensionNode.id,
      extensionsNode.id)  // parentToNodeId

    // Return
    return true
  }

  /**
   * Copies freshly loaded extension nodes out of the project they were loaded
   * into and into every other project under the working directory. Each project
   * is a directory of its own with its own state, so each is upgraded through
   * its own store rather than a shared one.
   */
  async upgradeToUserProjects(
    store: ProjectStore,
    project: ProjectRecord,
    extensionNodes: SourceNodeRecord[]) {

    // Get user projects
    const userProjects = await
      projectRegistryService.getProjectList()

    // Per user project/extensionNode
    var copyCount = 0

    for (const userProject of userProjects) {

      // Skip the project the extensions were loaded into: they are already
      // there, and copying a node onto itself would duplicate the graph
      if (userProject.path === project.path) {
        continue
      }

      const userStore = projectRegistryService.getStore(userProject)

      // Per extensionNode
      for (const extensionNode of extensionNodes) {

        const copied = await
          this.upgradeToUserProject(
            store,
            userStore,
            userProject,
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
