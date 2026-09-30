import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { listSubdirectories } from '@/core/walk-dir.js'
import { input } from '@inquirer/prompts'
import { ExtensionMutateService } from './mutate-service.js'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service.js'
import { LoadExternalHooksService } from '../hooks/load-external-service.js'
import { LoadExternalSkillsService } from '../skills/load-external-service.js'
import { PathsService } from '@/services/utils/paths-service.js'

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

    // Load extension file
    const extensionFilename = `${loadPath}${path.sep}extension.json`
    const extensionContents = fs.readFileSync(extensionFilename, 'utf-8')

    // Parse
    const extensionJson = JSON.parse(extensionContents)

    // Validate
    if (extensionJson.id == null) {
      console.error(`Extension file is missing id field`)
      return
    }

    if (extensionJson.id == null) {
      console.error(`Extension file is missing name field`)
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

  async loadBundledExtensions(
    store: ProjectStore,
    projectId: string) {

    // Determine extensions path
    const bundledPath = pathsService.getBundledPath()
    const extensionsPath = `${bundledPath}/extensions`

    // Debug
    // console.log(`${fnName}: extensionsPath: ${extensionsPath}`)

    // Install bundled extensions
    await this.loadExtensionsInPath(
      store,
      projectId,
      extensionsPath)
  }

  async loadExtensionsInPath(
          store: ProjectStore,
          projectId: string,
          loadPath: string) {

    // Get the extension directories below the path
    const pathsList = await listSubdirectories(loadPath)

    // Load extensions
    const extensionNodes: SourceNodeRecord[] = []

    for (const fullPath of pathsList) {

      // Debug
      // console.log(`${fnName}: fullPath: ${fullPath}`)

      // Check for extension.json
      const extensionJsonFilename = `${fullPath}${path.sep}extension.json`

      if (await fs.existsSync(extensionJsonFilename) === false) {
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

  /**
   * Loads extensions from a directory into the project the command is running
   * in.
   */
  async promptForAndLoadPath(
    store: ProjectStore,
    project: ProjectRecord) {

    // Prompt for a path
    console.log(``)
    console.log(chalk.bold(`─── Load extensions ───`))
    console.log(``)

    const loadPath = await
      input({ message: `Enter the path to load extensions from` })

    // Load path
    await this.loadExtensionsInPath(
      store,
      project.id,
      loadPath)
  }
}
