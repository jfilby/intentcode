import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { Instance, PrismaClient, SourceNode, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '../graphs/dependencies/mutate-service'
import { DepsJsonService } from '../managed-files/deps/deps-json-service'
import { DotIntentCodeGraphMutateService } from '../graphs/dot-intentcode/graph-mutate-service'
import { ExtensionMutateService } from '../extensions/extension/mutate-service'
import { FsUtilsService } from '../utils/fs-utils-service'
import { IntentCodeGraphMutateService } from '../graphs/intentcode/graph-mutate-service'
import { ProjectsMutateService } from './mutate-service'
import { ProjectsQueryService } from './query-service'
import { ProjectGraphMutateService } from '../graphs/project/mutate-service'
import { ProjectGraphQueryService } from '../graphs/project/query-service'
import { SourceCodeGraphMutateService } from '../graphs/source-code/graph-mutate-service'
import { SpecsGraphMutateService } from '../graphs/specs/graph-mutate-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const consoleService = new ConsoleService()
const dependenciesMutateService = new DependenciesMutateService()
const depsJsonService = new DepsJsonService()
const dotIntentCodeGraphMutateService = new DotIntentCodeGraphMutateService()
const extensionMutateService = new ExtensionMutateService()
const fsUtilsService = new FsUtilsService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const projectsMutateService = new ProjectsMutateService()
const projectsQueryService = new ProjectsQueryService()
const projectGraphMutateService = new ProjectGraphMutateService()
const projectGraphQueryService = new ProjectGraphQueryService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()
const specsGraphMutateService = new SpecsGraphMutateService()

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
        consoleService.askQuestion('project name> ')

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

    if (instance != null) {

      // Get project node
      const projectNode = await
              projectGraphQueryService.getProjectNode(
                prisma,
                instance.id)

      // Project name
      const existingProjectName = instance.name!

      // Console output
      console.log(`Project already exists: ${instance.name}`)

      // Return
      return {
        instance,
        projectNode,
        projectName: existingProjectName
      }
    }

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

    // Setup project node
    const projectNode = await
            this.setupProject(
              prisma,
              instance,
              projectName,
              path)

    // Return
    return { instance, projectNode, projectName }
  }

  async initProjectFromCli(
          prisma: PrismaClient,
          adminUserProfile: UserProfile) {

    // Console output.
    console.log(`Project path? Press enter to use the current path`)

    // Prompt for project path
    const inputProjectPath = await
            consoleService.askQuestion('project path> ')

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
    fs.mkdirSync(configPath, { recursive: true })

    // Load deps config file
    await this.loadDepsConfigFile(
            prisma,
            projectNode,
            configPath)
  }

  async loadDepsConfigFile(
          prisma: PrismaClient,
          projectNode: SourceNode,
          configPath: string) {

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

      await extensionMutateService.loadExtensionsInSystemToUserProjectByMap(
              prisma,
              projectNode.instanceId,
              depsNode.jsonContent.extensions)
    }
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
    const intentPath = `${projectPath}${path.sep}intent`
    const srcPath = `${projectPath}${path.sep}src`
    const specsPath = `${projectPath}${path.sep}specs`

    // Get/create specs project node
    if (await fs.existsSync(specsPath)) {

      const projectSpecsNode = await
              specsGraphMutateService.getOrCreateSpecsProject(
                prisma,
                projectNode,
                specsPath)
    }

    // Get/create dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphMutateService.getOrCreateDotIntentCodeProject(
              prisma,
              projectNode,
              dotIntentCodePath)

    // Get/create IntentCode project node
    if (await fs.existsSync(intentPath)) {

      const projectIntentCodeNode = await
              intentCodeGraphMutateService.getOrCreateIntentCodeProject(
                prisma,
                projectNode,
                intentPath)
    }

    // Get/create source code project node
    if (await fs.existsSync(intentPath) ||
        await fs.existsSync(srcPath)) {

      const projectSourceCodeNode = await
              sourceCodeGraphMutateService.getOrCreateSourceCodeProject(
                prisma,
                projectNode,
                srcPath)
    }

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
