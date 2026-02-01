import chalk from 'chalk'
import { Instance, PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionMutateService } from './mutate-service'
import { ExtensionQueryService } from './query-service'
import { GraphsDeleteService } from '@/services/graphs/general/delete-service'
import { GraphsMutateService } from '@/services/graphs/general/mutate-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
const consoleService = new ConsoleService()
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const graphsDeleteService = new GraphsDeleteService()
const graphsMutateService = new GraphsMutateService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class ManageExtensionsCliService {

  // Consts
  clName = 'ManageExtensionsCliService'

  // Code
  async loadExtensionIntoProject(
          prisma: PrismaClient,
          systemProject: Instance,
          extensionNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.loadExtensionIntoProject()`

    // Start
    console.log(``)
    console.log(`Load extension: ${extensionNode.name} into a project`)
    console.log(`---`)

    // Get project by list
    const loadToInstance = await
            projectsQueryService.getProjectByList(prisma)

    // Validate
    if (loadToInstance == null) {

      console.log(`Invalid to project`)
      return
    }

    // Output
    console.log(``)
    console.log(`Loading into project: ${loadToInstance.name}..`)

    // Get the extensions node of the to project
    var extensionsNode = await
          extensionMutateService.getOrCreateExtensionsNode(
            prisma,
            loadToInstance.id)

    // Validate
    if (extensionsNode == null) {
      throw new CustomError(`${fnName}: extensionsNode == null`)
    }

    // Load the Extension into the selected project
    await graphsMutateService.copyNodesToProject(
            prisma,
            systemProject.id,
            loadToInstance.id,
            extensionNode.id,
            extensionsNode.id)  // parentToNodeId

    console.log(``)
    console.log(`Extension copied OK`)
  }

  async repl(
          prisma: PrismaClient,
          instance?: Instance) {

    // Debug
    const fnName = `${this.clName}.repl()`

    // Loop
    while (true) {

      // Print options
      console.log(``)
      console.log(chalk.bold(`─── Extension management options ───`))
      console.log(``)
      console.log(`[s] All available extensions in the system`)

      if (instance != null) {
        console.log(`[p] Enabled extensions for this project`)
      }

      console.log(`[x] Exit`)

      // Prompt for project load method
      const selection = await
              consoleService.askQuestion('> ')

      // Handle the user selection
      switch (selection.trim()) {

        case '': {
          break
        }

        case 's': {
          await this.systemProjectExtensions(prisma)
          break
        }

        case 'p': {
          await this.userProjectExtensions(
                  prisma,
                  instance!)

          break
        }

        case 'x': {
          process.exit(0)
        }

        default: {
          console.log(`Invalid selection`)
        }
      }
    }
  }

  async run(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.run()`

    // Ask for project load method
    console.log(``)
    console.log(chalk.bold(`─── Do you want to specify a project? ───`))
    console.log(``)
    console.log(`[c] Yes, by current directory`)
    console.log(`[l] Yes, by list`)
    console.log(`[s] No (system only)`)
    console.log(`[b] Back`)

    // Prompt for project load method
    const loadProjectMethod = await
            consoleService.askQuestion('> ')

    // Get project by method
    var instance: Instance | undefined = undefined

    switch (loadProjectMethod) {

      case 'c': {
        instance = await
          projectsQueryService.getProjectByPath(
            prisma,
            process.cwd())

        break
      }

      case 'l': {
        instance = await
          projectsQueryService.getProjectByList(prisma)

        break
      }

      case 's': {
        break
      }

      case 'b': {
        return
      }

      default: {
        console.log(`Invalid selection`)
        process.exit(1)
      }
    }

    // REPL
    await this.repl(
            prisma,
            instance)
  }

  async systemProjectExtensions(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.systemProjectExtensions()`

    // Get System project
    const systemProject = await
            projectsQueryService.getProject(
              prisma,
              null,  // parentId
              ServerOnlyTypes.systemProjectName)

    // Validate
    if (systemProject == null) {
      throw new CustomError(`${fnName}: systemProject == null`)
    }

    // Get system extensions
    const extensionsData = await
            extensionQueryService.loadExtensions(
              prisma,
              systemProject.id)

    // Validate
    if (extensionsData == null) {
      throw new CustomError(`${fnName}: extensionsData == null`)
    }

    // Start
    console.log(``)
    console.log(chalk.bold(`─── Project: ${systemProject.name} ───`))
    console.log(``)
    console.log(`[b] Back`)

    // List project extensions
    var i = 1
    var extensionsMap = new Map<string, SourceNode>()

    for (const extension of extensionsData.extensionNodes) {

      console.log(`${i}: ${extension.name}`)

      extensionsMap.set(
        `${i}`,
        extension)

      i += 1
    }

    // Prompt for selection
    const selection = await
            consoleService.askQuestion('> ')

    // Handle selection
    if (selection === 'b') {
      return
    }

    // Handle extension selection
    if (extensionsMap.has(selection)) {

      await this.viewExtension(
              prisma,
              systemProject,
              extensionsMap.get(selection)!)
    }
  }

  async userProjectExtensions(
          prisma: PrismaClient,
          instance: Instance) {

    // Debug
    const fnName = `${this.clName}.userProjectExtensions()`

    // Get project extensions
    const extensionsData = await
            extensionQueryService.loadExtensions(
              prisma,
              instance.id)

    // Validate
    if (extensionsData == null) {
      throw new CustomError(`${fnName}: extensionsData == null`)
    }

    // Start
    console.log(``)
    console.log(chalk.bold(`─── Project: ${instance.name} ───`))
    console.log(``)
    console.log(`[b] Back`)

    // List project extensions
    var i = 1
    var extensionsMap = new Map<string, SourceNode>()

    for (const extension of extensionsData.extensionNodes) {

      console.log(`[${i}] ${extension.name}`)

      extensionsMap.set(
        `${i}`,
        extension)

      i += 1
    }

    // Prompt for selection
    const selection = await
            consoleService.askQuestion('> ')

    // Handle selection
    if (selection === 'b') {
      return
    }

    // Handle extension selection
    if (extensionsMap.has(selection)) {

      await this.viewExtension(
              prisma,
              instance,
              extensionsMap.get(selection)!)
    }
  }

  async viewExtension(
          prisma: PrismaClient,
          instance: Instance,
          extensionNode: SourceNode) {

    // Start
    console.log(``)
    console.log(chalk.bold(`─── Project: ${instance.name} ───`))
    console.log(chalk.bold(`─── Extension: ${extensionNode.name} ───`))
    console.log(``)

    // Print details
    console.log(`Options:`)
    console.log(`---`)
    console.log(`[b] Back`)

    if (instance.name === ServerOnlyTypes.systemProjectName) {

      console.log(`[l] Load extension into a project`)
    }

    console.log(`[d] Delete this extension`)

    // Prompt for selection
    const selection = await
            consoleService.askQuestion('> ')

    // Handle selection
    switch (selection) {

      case 'b': {
        break
      }

      case 'l': {
        await this.loadExtensionIntoProject(
                prisma,
                instance,
                extensionNode)

        break
      }

      case 'd': {
        await graphsDeleteService.deleteSourceNodeCascade(
                prisma,
                extensionNode.id,
                true)  // deleteThisNode

        break
      }

      default: {
        console.log(`Invalid selection`)
        break
      }
    }
  }
}
