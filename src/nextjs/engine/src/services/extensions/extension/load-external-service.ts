const fs = require('fs')
import path from 'path'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionMutateService } from './mutate-service'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service'
import { LoadExternalHooksService } from '../hooks/load-external-service'
import { LoadExternalSkillsService } from '../skills/load-external-service'
import { ProjectsQueryService } from '../../projects/query-service'

// Services
const consoleService = new ConsoleService()
const extensionMutateService = new ExtensionMutateService()
const graphsDeleteService = new GraphsDeleteService()
const loadExternalHooksService = new LoadExternalHooksService()
const loadExternalSkillsService = new LoadExternalSkillsService()
const projectsQueryService = new ProjectsQueryService()
const walkDirService = new WalkDirService()

// Class
export class LoadExternalExtensionsService {

  // Consts
  clName = 'LoadExternalExtensionsService'

  // Code
  async getOrCreateExtension(
          prisma: PrismaClient,
          instanceId: string,
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
              prisma,
              instanceId)

    // Validate
    if (extensionsNode == null) {
      throw new CustomError(`${fnName}: extensionsNode == null`)
    }

    // Get/create extension node
    const extensionNode = await
            extensionMutateService.getOrSaveExtensionNode(
              prisma,
              instanceId,
              extensionsNode.id,
              extensionJson)

    // Return
    return extensionNode
  }

  async loadExtensionsInPath(
          prisma: PrismaClient,
          instanceId: string,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadExtensionsInPath()`

    // Walk dir
    var pathsList: string[] = []

    await walkDirService.walkDir(
            loadPath,
            pathsList,
            {
              recursive: false
            })

    // Load extensions
    const extensionNodes: SourceNode[] = []

    for (const fullPath of pathsList) {

      // Skip if not a dir
      const stats = await fs.statSync(fullPath)

      if (stats.isDirectory(fullPath) === false) {
        continue
      }

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
          prisma,
          instanceId,
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
          prisma: PrismaClient,
          instanceId: string,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadExtensionInPath()`

    // Validate
    if (instanceId == null) {
      throw new CustomError(`${fnName}: instanceId == null`)
    }

    if (loadPath == null) {
      throw new CustomError(`${fnName}: loadPath == null`)
    }

    // Get/create the extension
    const extensionNode = await
            this.getOrCreateExtension(
              prisma,
              instanceId,
              loadPath)

    // Validate
    if (extensionNode == null) {
      throw new CustomError(`${fnName}: extensionNode == null`)
    }

    // Delete any nodes under the extension
    await graphsDeleteService.deleteSourceNodeCascade(
            prisma,
            extensionNode.id,
            false)  // deleteThisNode

    // Load skills
    await loadExternalSkillsService.loadFromPath(
            prisma,
            instanceId,
            extensionNode,
            `${loadPath}/skills`)

    // Load hooks
    await loadExternalHooksService.loadFromPath(
            prisma,
            instanceId,
            extensionNode,
            `${loadPath}/hooks`)

    // Return
    return extensionNode
  }

  async promptForAndLoadPath(prisma: PrismaClient) {

    // Prompt for a path
    console.log(`Enter the path to load extensions from`)

    const loadPath = await
            consoleService.askQuestion('> ')

    // Get the System project
    const systemInstance = await
            projectsQueryService.getProject(
              prisma,
              null,  // parentId
              ServerOnlyTypes.systemProjectName)

    // Validate
    if (systemInstance == null) {
      console.error(`System project not found (run setup)`)
      return
    }

    // Load path
    const extensionNodes = await
      this.loadExtensionsInPath(
        prisma,
        systemInstance.id,
        loadPath)

    // Prompt whether to load into user projects
    console.log(`Copy new versions to existing user projects? Y/N`)

    const loadToUserProjects = await
            consoleService.askQuestion('> ')

    if (loadToUserProjects.toLowerCase() !== 'y') {
      return
    }

    // Load into user projects
    const copyCount = await
      extensionMutateService.upgradeToUserProjects(
        prisma,
        extensionNodes)

    // Done
    console.log(`Copied to ${copyCount} user projects`)
  }
}
