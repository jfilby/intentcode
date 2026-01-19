const fs = require('fs')
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionMutateService } from './mutate-service'
import { ExtensionQueryService } from './query-service'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service'
import { LoadExternalHooksService } from '../hooks/load-external-service'
import { LoadExternalSkillsService } from '../skills/load-external-service'
import { ProjectsQueryService } from '../../projects/query-service'

// Services
const consoleService = new ConsoleService()
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
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
            extensionQueryService.getExtensionsNode(
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
      await this.loadExtensionInPath(
              prisma,
              instanceId,
              fullPath)
    }
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
              ServerOnlyTypes.systemProjectName)

    // Validate
    if (systemInstance == null) {
      console.error(`System project not found (run setup)`)
      return
    }

    // Load path
    await this.loadExtensionsInPath(
            prisma,
            systemInstance.id,
            loadPath)
  }
}
