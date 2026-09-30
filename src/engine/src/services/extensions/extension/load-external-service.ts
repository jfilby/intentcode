import fs from 'fs'
import path from 'path'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { listSubdirectories } from '@/core/walk-dir.js'
import semver from 'semver'
import { ExtensionMutateService } from './mutate-service.js'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service.js'
import { LoadExternalHooksService } from '../hooks/load-external-service.js'
import { LoadExternalSkillsService } from '../skills/load-external-service.js'
import { PathsService } from '@/services/utils/paths-service.js'

// Types

/**
 * An `extension.json` file: an id, plus whatever else the extension says. The
 * version is read out of it when a project pins one, so it is typed as the
 * string the file is expected to hold.
 */
type ExtensionJson = {
  id?: string
  version?: string
  [key: string]: unknown
}

/**
 * The extensions a project asks for, keyed by extension name with the lowest
 * version it will take.
 */
type RequestedExtensions = Record<string, string>

/**
 * An `extension.json` that names an id, which every extension has to. A file
 * that names none is rejected rather than read.
 */
type NamedExtensionJson = ExtensionJson & { id: string }

// Services
const extensionMutateService = new ExtensionMutateService()
const pathsService = new PathsService()
const graphsDeleteService = new GraphsDeleteService()
const loadExternalHooksService = new LoadExternalHooksService()
const loadExternalSkillsService = new LoadExternalSkillsService()

// Class
export class LoadExternalExtensionsService {

  // Consts
  clName = 'LoadExternalExtensionsService'

  // Code
  async getOrCreateExtension(
          store: ProjectStore,
          projectId: string,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateExtension()`

    // Read the extension file
    const extensionJson = this.readExtensionJson(loadPath)

    // Validate
    if (extensionJson == null) {
      return
    }

    // Get extensions node
    const extensionsNode = await
            extensionMutateService.getOrCreateExtensionsNode(
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

    // Get/create extension node
    const extensionNode = await
            extensionMutateService.getOrSaveExtensionNode(
              store,
              projectId,
              extensionsNode.id,
              extensionJson)

    // Return
    return extensionNode
  }

  /**
   * Loads the named bundled extensions into a project. A bundled extension is
   * read out of the engine directory and written into the project like any
   * other extension: there is no separate record of them to copy from.
   */
  async loadBundledExtensionsByName(
          store: ProjectStore,
          projectId: string,
          extensionNames: string[]) {

    return await this.loadExtensionsInPath(
            store,
            projectId,
            pathsService.getBundledExtensionsPath(),
            extensionNames)
  }

  /**
   * Loads the extensions a project's deps file asks for, taking the bundled
   * version at or above the one named. A project that names an extension the
   * engine does not bundle cannot be built, so that is an error rather than a
   * warning.
   */
  async loadBundledExtensionNodes(
          store: ProjectStore,
          projectId: string,
          extensions: RequestedExtensions) {

    for (const [loadName, loadMinVersionNo] of Object.entries(extensions)) {

      // Find the bundled extension at or above the version asked for
      const loadPath = await this.getBundledExtensionPath(
              loadName,
              loadMinVersionNo as string)

      // Validate
      if (loadPath == null) {

        console.log(
          `Extension ${loadName}: ${loadMinVersionNo} is not one of the ` +
          `bundled extensions`)

        process.exit(1)
      }

      // Load the extension into the project
      await this.loadExtensionInPath(store, projectId, loadPath)
    }
  }

  /**
   * The bundled extension directory holding the extension named, at the
   * lowest version at or above the one asked for. Null when the engine
   * bundles no such extension, or none at a high enough version.
   */
  async getBundledExtensionPath(
          extensionName: string,
          minVersionNo: string) {

    const minVersion = semver.minVersion(minVersionNo)
    const pathsList =
      await listSubdirectories(pathsService.getBundledExtensionsPath())

    let bestPath: string | null = null
    let bestVersionNo: string | null = null

    for (const fullPath of pathsList) {

      // Only a directory holding an extension.json is an extension
      const extensionJson = this.readExtensionJson(fullPath)

      if (extensionJson == null || extensionJson.id !== extensionName) {
        continue
      }

      const versionNo = extensionJson.version

      // Only a version that is high enough will do
      if (versionNo == null || semver.lt(versionNo, minVersion!)) {
        continue
      }

      // Get if a higher version than the one already known
      if (bestVersionNo == null || semver.gt(versionNo, bestVersionNo)) {

        bestPath = fullPath
        bestVersionNo = versionNo
      }
    }

    // Return
    return bestPath
  }

  /**
   * The `extension.json` in a directory, or null when the directory is not an
   * extension or names no id. A directory that names no id says so, because
   * that is a fault in the engine's own bundle rather than in the caller.
   */
  readExtensionJson(loadPath: string): NamedExtensionJson | null {

    const extensionFilename = path.join(loadPath, 'extension.json')

    if (fs.existsSync(extensionFilename) === false) {
      return null
    }

    const parsed: ExtensionJson =
      JSON.parse(fs.readFileSync(extensionFilename, 'utf-8'))

    // Validate
    if (parsed.id == null) {
      console.error(`Extension file is missing id field`)
      return null
    }

    return { ...parsed, id: parsed.id }
  }

  /**
   * Loads extensions from a directory into a project. `onlyIds` names the
   * ones to load; every extension there is loaded when it is absent.
   */
  async loadExtensionsInPath(
          store: ProjectStore,
          projectId: string,
          loadPath: string,
          onlyIds?: string[]) {

    // Get the extension directories below the path
    const pathsList = await listSubdirectories(loadPath)

    // Load extensions
    const extensionNodes: SourceNodeRecord[] = []

    for (const fullPath of pathsList) {

      // Debug
      // console.log(`${fnName}: fullPath: ${fullPath}`)

      // Only a directory holding an extension.json is an extension
      const extensionJson = this.readExtensionJson(fullPath)

      if (extensionJson == null) {
        continue
      }

      // Only the extensions that were asked for
      if (onlyIds != null && !onlyIds.includes(extensionJson.id)) {
        continue
      }

      // Load extension
      const extensionNode = await
        this.loadExtensionInPath(
          store,
          projectId,
          fullPath)

      // Add to extensionNodes
      if (extensionNode != null) {
        extensionNodes.push(extensionNode)
      }
    }

    // Return
    return extensionNodes
  }

  async loadExtensionInPath(
          store: ProjectStore,
          projectId: string,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadExtensionInPath()`

    // Validate
    if (projectId == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'projectId == null'
      })
    }

    if (loadPath == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'loadPath == null'
      })
    }

    // Get/create the extension
    const extensionNode = await
            this.getOrCreateExtension(
              store,
              projectId,
              loadPath)

    // Validate
    if (extensionNode == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionNode == null'
      })
    }

    // Delete any nodes under the extension
    await graphsDeleteService.deleteSourceNodeCascade(
            store,
            extensionNode.id,
            false)  // deleteThisNode

    // Load skills
    await loadExternalSkillsService.loadFromPath(
            store,
            projectId,
            extensionNode,
            `${loadPath}/skills`)

    // Load hooks
    await loadExternalHooksService.loadFromPath(
            store,
            projectId,
            extensionNode,
            `${loadPath}/hooks`)

    // Return
    return extensionNode
  }
}
