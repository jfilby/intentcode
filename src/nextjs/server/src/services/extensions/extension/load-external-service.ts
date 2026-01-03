const fs = require('fs')
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { ExtensionMutateService } from './mutate-service'
import { LoadExternalHooksService } from '../hooks/load-external-service'
import { LoadExternalSkillsService } from '../skills/load-external-service'
import { ProjectsQueryService } from '../../projects/query-service'

// Services
const consoleService = new ConsoleService()
const extensionMutateService = new ExtensionMutateService()
const loadExternalHooksService = new LoadExternalHooksService()
const loadExternalSkillsService = new LoadExternalSkillsService()
const projectsQueryService = new ProjectsQueryService()

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

    // Get/create extension node
    const extensionNode = await
            extensionMutateService.getOrSaveExtensionNode(
              prisma,
              instanceId,
              extensionJson)

    // Return
    return extensionNode
  }

  async loadPath(
          prisma: PrismaClient,
          instanceId: string,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadPath()`

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

    // Delete any nodes under the extension
    ;

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

    // Load project by cwd
    const instance = await
            projectsQueryService.getProjectByPath(
              prisma,
              loadPath)

    // Found
    if (instance == null) {
      console.error(`No project found in the current path`)
      return
    }

    // Load path
    await this.loadPath(
            prisma,
            instance.id,
            loadPath)
  }
}
