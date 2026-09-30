import semver from 'semver'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { ExtensionsData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import {
  getSystemProject,
  getSystemStore
} from '@/services/projects/system-project.js'

// Types

/**
 * The `id`, `name` and `version` read out of an extension's jsonContent. The
 * jsonContent is whatever the extension's `extension.json` held, so only the
 * fields read here are named.
 */
type ExtensionJsonContent = {
  id?: unknown
  name?: unknown
  version?: unknown
}

/**
 * The `version` read out of an extension's jsonContent when picking the
 * highest version a project will take. A version is what semver compares, so
 * it is read as the string the file is expected to hold.
 */
type VersionedExtensionJsonContent = {
  version?: string
}

/** The name a hook's jsonContent is read for. */
type HookJsonContent = {
  name?: unknown
}

// Models
const sourceNodeModel = new SourceNodeModel()

// Services

// Class
export class ExtensionQueryService {

  // Consts
  clName = 'ExtensionQueryService'

  // Code
  async checkExtensionsExist(
          store: ProjectStore,
          projectId: string,
          extensionIds: string[],
          verbose: boolean = false) {

    // Debug
    const fnName = `${this.clName}.checkExtensionsExist()`

    // Get extensions node
    const extensionsNode = await
            this.getExtensionsNode(
              store,
              projectId)

    // Validate
    if (extensionsNode == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsNode == null'
      })
    }

    // Get extension nodes
    const extensionNodes = await
            sourceNodeModel.filter(
              store,
              extensionsNode.id)

    // List all loaded extensions if verbose
    if (verbose === true) {

      for (const extensionNode of extensionNodes) {

        console.log(`..${extensionNode.name} loaded`)
      }
    }

    // Ensure each extension id exists
    for (const extensionId of extensionIds) {

      let found = false

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
          store: ProjectStore,
          projectId: string) {

    // Get all extensions with their hooks for the project
    const extensionNodes = await
            sourceNodeModel.filterWithChildNodes(
              store,
              projectId,
              SourceNodeTypes.extensionType,
              [SourceNodeTypes.hooksType])

    // No extensions?
    if (extensionNodes.length === 0) {
      return null
    }

    // Generate prompting
    let prompting = ``

    // Iterate extension nodes
    for (const extensionNode of extensionNodes) {

      if (extensionNode.jsonContent == null) {
        continue
      }

      const extensionJsonContent =
        extensionNode.jsonContent as ExtensionJsonContent

      prompting +=
        `### Extension id: ${extensionJsonContent.id}\n` +
        `\n` +
        `Name: ${extensionJsonContent.name}` +
        `Version: ${extensionJsonContent.version}` +
        `\n`

      // Iterate hook nodes
      for (const hookNode of extensionNode.children ?? []) {

        if (hookNode.jsonContent == null) {
          continue
        }

        const hookJsonContent = hookNode.jsonContent as HookJsonContent

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
          store: ProjectStore,
          projectId: string,
          extensionsNodeId: string,
          getName: string,
          getMinVersionNo: string) {

    // Debug
    const fnName = `${this.clName}.getExtension()`

    // console.log(
    //   `${fnName}: projectId: ${projectId} extensionsNodeId: ` +
    //   `${extensionsNodeId} getName: ${getName}`)

    // Get potential extension nodes
    const extensions = await
            sourceNodeModel.filter(
              store,
              extensionsNodeId,  // parentId
              projectId,
              SourceNodeTypes.extensionType,
              getName)

    // Get semantic min version
    const minVersionNo = semver.minVersion(getMinVersionNo)

    // Get the highest version above minVersionNo
    let highestExtensionNode: SourceNodeRecord | undefined = undefined
    let highestVersionNo: string | undefined = undefined

    for (const extension of extensions) {

      // Debug
      // console.log(`${fnName}: trying: ` + JSON.stringify(extension))

      // Get the version no
      const versionNo =
        (extension.jsonContent as VersionedExtensionJsonContent | null)
          ?.version

      // Validate
      if (versionNo == null) {
        throw new IntentError({
          category: 'ExtensionError',
          stage: fnName,
          message:
            `extension with SourceNode.id: ${extension.id} doesn't have a ` +
            `version set`
        })
      }

      // Is the version above the minimum required?
      if (semver.lt(
            versionNo,
            minVersionNo!)) {

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
          store: ProjectStore,
          projectId: string) {

    // Debug
    const fnName = `${this.clName}.getExtensionNodes()`

    // Get extensions node
    const extensionsNode = await
            this.getExtensionsNode(
              store,
              projectId)

    // Validate
    if (extensionsNode == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsNode == null'
      })
    }

    // Get extensions
    const extensions = await
            sourceNodeModel.filter(
              store,
              extensionsNode.id,
              projectId)

    // Return
    return extensions
  }

  async getExtensionsNode(
          store: ProjectStore,
          projectId: string) {

    // Get extensions node
    const extensionsNode = await
            sourceNodeModel.getByUniqueKey(
              store,
              null,  // parentId
              projectId,
              SourceNodeTypes.extensionsType,
              SourceNodeNames.extensionsName)

    // Return
    return extensionsNode
  }

  async loadExtension(
          store: ProjectStore,
          projectId: string,
          extensionNode: SourceNodeRecord,
          withSkills: boolean = true,
          withHooks: boolean = true) {

    // Get skills
    let skillNodes: SourceNodeRecord[] = []

    if (withSkills === true) {

      skillNodes = await
        sourceNodeModel.filter(
          store,
          extensionNode.id,  // parentId
          projectId,
          SourceNodeTypes.skillType)
    }

    // Get hooks
    let hooksNodes: SourceNodeRecord[] = []

    if (withHooks === true) {

      hooksNodes = await
        sourceNodeModel.filter(
          store,
          extensionNode.id,  // parentId
          projectId,
          SourceNodeTypes.hooksType)
    }

    // Return
    return {
      extensionSkillNodes: skillNodes,
      extensionHooksNodes: hooksNodes
    }
  }

  async loadExtensions(
          store: ProjectStore,
          projectId: string,
          withSkills: boolean = true,
          withHooks: boolean = true) {

    // Get the extensions node
    const extensionsNode = await
            this.getExtensionsNode(
              store,
              projectId)

    if (extensionsNode == null) {
      return undefined
    }

    // Get extensions
    const extensionNodes = await
            sourceNodeModel.filter(
              store,
              extensionsNode.id,  // parentId
              projectId,
              SourceNodeTypes.extensionType,
              undefined,
              undefined,
              undefined,
              true)       // orderByUniqueKey (for prompt reproducibility)

    // Load extensions
    let skillNodes: SourceNodeRecord[] = []
    let hooksNodes: SourceNodeRecord[] = []

    for (const extensionNode of extensionNodes) {

      const { extensionSkillNodes, extensionHooksNodes } = await
        this.loadExtension(
          store,
          projectId,
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

  /**
   * The extensions of the System project, which is where the bundled ones are
   * read from. The System project is the engine directory rather than one
   * named by an intent.toml, so it is built from the engine path.
   */
  async systemProjectExtensions() {

    // Debug
    const fnName = `${this.clName}.systemProjectExtensions()`

    const systemProject = getSystemProject()

    // Get system extensions
    const extensionsData = await
            this.loadExtensions(
              getSystemStore(),
              systemProject.id)

    // Validate
    if (extensionsData == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsData == null'
      })
    }

    // Return
    return extensionsData
  }
}
