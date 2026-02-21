import fs from 'fs'
import path from 'path'
import { input } from '@inquirer/prompts'
import { blake3 } from '@noble/hashes/blake3'
import { Instance, PrismaClient, SourceNode, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '../graphs/dependencies/mutate-service'
import { DepsJsonService } from '../managed-files/deps/deps-json-service'
import { DotIntentCodeGraphMutateService } from '../graphs/dot-intentcode/graph-mutate-service'
import { ExtensionMutateService } from '../extensions/extension/mutate-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { ProjectsMutateService } from './mutate-service'
import { ProjectsQueryService } from './query-service'
import { ProjectGraphMutateService } from '../graphs/project/mutate-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const depsJsonService = new DepsJsonService()
const dotIntentCodeGraphMutateService = new DotIntentCodeGraphMutateService()
const extensionMutateService = new ExtensionMutateService()
const fsUtilsService = new FsUtilsService()
const projectsMutateService = new ProjectsMutateService()
const projectsQueryService = new ProjectsQueryService()
const projectGraphMutateService = new ProjectGraphMutateService()

// Class
export class ProjectSetupService {

  // Consts
  clName = 'ProjectSetupService'

  // Code
  async getOrPromptForProjectName(
          prisma: PrismaClient,
          parentInstance: Instance,
          path: string) {

    // Debug
    const fnName = `${this.clName}.getOrPromptForProjectName()`

    // Try to use the last part of the path as the project name
    var projectName = fsUtilsService.getLastPathPart(path)

    var instance = await
          projectsQueryService.getProject(
            prisma,
            parentInstance != null ? parentInstance.id : null,
            projectName!)

    // Loop until a project name that doesn't clash is given
    while (instance != null) {

      // Prompt
      console.log(`The project name ${projectName} isn't unique`)

      if (parentInstance != null) {
        console.log(`.. under the parent project: ${parentInstance.name}`)
      }

      projectName = await
        input({ message: `project name> `})

      // Check for another instance that already exists for the parent
      instance = await
        projectsQueryService.getProject(
          prisma,
          parentInstance != null ? parentInstance.id : null,
          projectName)
    }

    // Return
    return projectName
  }

  async initProject(
          prisma: PrismaClient,
          path: string,
          adminUserProfile: UserProfile) {

    // Debug
    const fnName = `${this.clName}.initProject()`

    // Check if the path exists
    if (await fs.existsSync(path) === false) {

      console.error(`Path doesn't exist: ${path}`)
      process.exit(1)
    }

    // Try to get an existing project by the path
    var instance = await
          projectsQueryService.getProjectByPath(
            prisma,
            path)

    // New project?
    if (instance == null) {

      // Lookup parent project (if any)
      const parentInstance = await
              projectsQueryService.getParentProjectByPath(
                prisma,
                path)

      // Get the last part of the path
      const projectName = await
              this.getOrPromptForProjectName(
                prisma,
                parentInstance,
                path)

      // Validate
      if (projectName == null) {
        throw new CustomError(`${fnName}: projectName == null`)
      }

      // Create instance
      instance = await
        projectsMutateService.getOrCreate(
          prisma,
          adminUserProfile.id,
          projectName)
    }

    // Setup project node
    const projectNode = await
            this.setupProject(
              prisma,
              instance,
              instance.name,
              path)

    // Return
    return { instance, projectNode, projectName: instance.name }
  }

  async initProjectFromCli(
          prisma: PrismaClient,
          adminUserProfile: UserProfile) {

    // Console output.
    console.log(`Project path? Press enter to use the current path`)

    // Prompt for project path
    const inputProjectPath = await
      input({ message: `>` })

    // Determine project path
    var projectPath = inputProjectPath

    if (inputProjectPath.trim.length === 0) {
      projectPath = process.cwd()
    }

    // Init project
    await this.initProject(
            prisma,
            projectPath,
            adminUserProfile)
  }

  async loadConfigFiles(
          prisma: PrismaClient,
          projectNode: SourceNode,
          configPath: string) {

    // Create the path if it doesn't exist
    if (!await fs.existsSync(configPath)) {
      await fs.mkdirSync(configPath, { recursive: true })
    }

    // Load deps config file
    await this.loadDepsConfigFile(
            prisma,
            projectNode,
            configPath)
  }

  async loadDepsConfigFile(
          prisma: PrismaClient,
          projectNode: SourceNode,
          configPath?: string) {

    // Debug
    const fnName = `${this.clName}.loadDepsConfigFile()`

    // Read and validate deps.json file
    const { found, data, filename } = await
            depsJsonService.readFile(
              prisma,
              projectNode)

    // Get/create Deps node
    var depsNode = await
          dependenciesMutateService.getOrCreateDepsNode(
            prisma,
            projectNode)

    // Prep depsNode for key/values
    if (depsNode.jsonContent == null) {
      depsNode.jsonContent = {}
    }

    // Load in depsJson for valid keys only
    if (data != null) {

      for (const [key, value] of Object.entries(data)) {

        // Load key/value
        depsNode.jsonContent[key] = value
      }
    }

    // Get jsonContentHash
    depsNode.jsonContentHash =
      blake3(JSON.stringify(depsNode.jsonContent)).toString()

    // Update DepsNode's jsonContent
    depsNode = await
      sourceNodeModel.setJsonContent(
        prisma,
        depsNode.id,
        depsNode.jsonContent,
        depsNode.jsonContentHash)

    // Load in extensions from System
    if (depsNode.jsonContent?.extensions != null) {

      console.log(`Loading extensions specified in ${filename}..`)

      await extensionMutateService.loadExtensionNodesInSystemToUserProject(
              prisma,
              projectNode.instanceId,
              depsNode.jsonContent.extensions)
    }

    // Return
    return depsNode
  }

  async setupProject(
          prisma: PrismaClient,
          instance: Instance,
          projectName: string,
          projectPath: string) {

    // Set the path
    await projectsMutateService.setProjectPath(
            prisma,
            instance.id,
            projectPath)

    // Get/create project node
    const projectNode = await
            projectGraphMutateService.getOrCreateProject(
              prisma,
              instance.id,
              projectName,
              projectPath)

    // Infer other paths
    const dotIntentCodePath = `${projectPath}${path.sep}.intentcode`

    // Get/create dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphMutateService.getOrCreateDotIntentCodeProject(
              prisma,
              projectNode,
              dotIntentCodePath)

    // Get/create extensions node
    const extensionsNode = await
            extensionMutateService.getOrCreateExtensionsNode(
              prisma,
              instance.id)

    // Load project-level config files
    if (await fs.existsSync(dotIntentCodePath)) {

      await this.loadConfigFiles(
              prisma,
              projectNode,
              dotIntentCodePath)
    }

    // Return
    return projectNode
  }
}
