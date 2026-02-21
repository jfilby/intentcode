import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { Instance, PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { CommonCommands, ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionMutateService } from './mutate-service'
import { ExtensionQueryService } from './query-service'
import { GraphsMutateService } from '@/services/graphs/general/mutate-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const graphsMutateService = new GraphsMutateService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class ManageExtensionsCliService {

  // Consts
  clName = 'ManageExtensionsCliService'

  currentDirCommand = 'current-dir'
  listDirCommand = 'list-dir'
  systemOnlyCommand = 'system-only'

  projectExtensionsCommand = 'project'
  systemExtensionsCommand = 'system'

  loadExtensionIntoProjectCommand = 'load'
  deleteExtensionCommand = '`delete'

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

    // Non-project (back)
    if (loadToInstance == null) {
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

      // Choices
      var choices = [
        {
          name: `Back`,
          value: CommonCommands.back
        },
        {
          name: `All available extensions in the system`,
          value: this.systemExtensionsCommand
        }
      ]

      if (instance != null) {
        choices.push({
          name: `Enabled extensions for this project`,
          value: this.projectExtensionsCommand
        })
      }

      // Prompt
      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: choices
      })

      // Handle the user selection
      switch (command) {

        case CommonCommands.back: {
          return
        }

        case this.systemExtensionsCommand: {
          await this.systemProjectExtensions(prisma)
          break
        }

        case this.projectExtensionsCommand: {
          await this.userProjectExtensions(
                  prisma,
                  instance!)

          break
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

    // Prompt
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: [
        {
          name: `Back`,
          value: CommonCommands.back
        },
        {
          name: `Yes, by current directory`,
          value: this.currentDirCommand
        },
        {
          name: `Yes, by list`,
          value: this.listDirCommand
        },
        {
          name: `No (system only)`,
          value: this.systemOnlyCommand
        }
      ]
    })

    // Get project by method
    var instance: Instance | undefined = undefined

    switch (command) {

      case this.currentDirCommand: {
        instance = await
          projectsQueryService.getProjectByPath(
            prisma,
            process.cwd())

        break
      }

      case this.listDirCommand: {
        instance = await
          projectsQueryService.getProjectByList(prisma)

        break
      }

      case this.systemOnlyCommand: {
        break
      }

      case CommonCommands.back: {
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

    // Choices
    var choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      }
    ]

    // List project extensions
    var i = 1
    var extensionsMap = new Map<string, SourceNode>()

    for (const extension of extensionsData.extensionNodes) {

      choices.push({
        name: extension.name,
        value: `${i}`
      })

      extensionsMap.set(
        `${i}`,
        extension)

      i += 1
    }

    // Prompt for command
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Handle selection
    if (command === CommonCommands.back) {
      return
    }

    // Handle extension selection
    if (extensionsMap.has(command)) {

      await this.viewExtension(
              prisma,
              systemProject,
              extensionsMap.get(command)!)
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

    // Choices
    var choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      }
    ]

    // List project extensions
    var i = 1
    var extensionsMap = new Map<string, SourceNode>()

    for (const extension of extensionsData.extensionNodes) {

      choices.push({
        name: extension.name,
        value: `${i}`
      })

      extensionsMap.set(
        `${i}`,
        extension)

      i += 1
    }

    // Prompt for command
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Handle selection
    if (command === CommonCommands.back) {
      return
    }

    // Handle extension selection
    if (extensionsMap.has(command)) {

      await this.viewExtension(
              prisma,
              instance,
              extensionsMap.get(command)!)
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

    // Choices
    var choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      }
    ]

    if (instance.name === ServerOnlyTypes.systemProjectName) {

      choices.push({
        name: `Load extension into a project`,
        value: this.loadExtensionIntoProjectCommand
      })
    }

    choices.push({
      name: `Delete this extension`,
      value: this.deleteExtensionCommand
    })

    // Prompt for command
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Handle selection
    switch (command) {

      case CommonCommands.back: {
        break
      }

      case this.loadExtensionIntoProjectCommand: {
        await this.loadExtensionIntoProject(
                prisma,
                instance,
                extensionNode)

        break
      }

      case this.deleteExtensionCommand: {
        await extensionMutateService.deleteExtension(
                prisma,
                extensionNode.id)

        break
      }

      default: {
        console.log(`Invalid selection`)
        break
      }
    }
  }
}
