import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { CommonCommands } from '@/types/server-only-types.js'
import { ExtensionMutateService } from './mutate-service.js'
import { ExtensionQueryService } from './query-service.js'
import { GraphsMutateService } from '@/services/graphs/general/mutate-service.js'
import { ProjectRegistryService } from '@/services/projects/project-registry.js'

// Services
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const graphsMutateService = new GraphsMutateService()
const projectRegistryService = new ProjectRegistryService()

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

  /**
   * Copies an extension from the System project into a project the user picks.
   * The two are separate stores, so the System one is named here rather than
   * taken from the caller: the caller may be running in the System project
   * itself.
   */
  async loadExtensionIntoProject(
          systemStore: ProjectStore,
          extensionNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.loadExtensionIntoProject()`

    // Start
    console.log(``)
    console.log(`Load extension: ${extensionNode.name} into a project`)
    console.log(`---`)

    // Get project by list
    const loadToProject = await this.getProjectByList()

    // Non-project (back)
    if (loadToProject == null) {
      return
    }

    // Output
    console.log(``)
    console.log(`Loading into project: ${loadToProject.name}..`)

    // Get the store and extensions node of the to project
    const loadToStore = projectRegistryService.getStore(loadToProject)

    const extensionsNode = await
          extensionMutateService.getOrCreateExtensionsNode(
            loadToStore,
            loadToProject.id)

    // Validate
    if (extensionsNode == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsNode == null'
      })
    }

    // Load the Extension into the selected project
    await graphsMutateService.copyNodesToProject(
            systemStore,
            loadToStore,
            loadToProject.id,
            extensionNode.id,
            extensionsNode.id)  // parentToNodeId

    console.log(``)
    console.log(`Extension copied OK`)
  }

  /**
   * Asks which project to act on, from the projects under the working
   * directory. Returns undefined when the user backs out.
   */
  async getProjectByList(): Promise<ProjectRecord | undefined> {

    // Get the projects
    const projects = await projectRegistryService.getProjectList()

    // Prompt
    const selected = await select({
      message: `Select a project`,
      loop: false,
      pageSize: 10,
      choices: [
        {
          name: `Back`,
          value: CommonCommands.back
        },
        ...projects.map(
          (project) => ({
            name: `${project.name} (${project.path})`,
            value: project.id
          }))
      ]
    })

    // Back
    if (selected === CommonCommands.back) {
      return undefined
    }

    // Return
    return projects.find((project) => project.id === selected)
  }

  async repl(
    store: ProjectStore,
    project: ProjectRecord) {

    // Loop
    while (true) {

      // Print options
      console.log(``)
      console.log(chalk.bold(`─── Extension management options ───`))
      console.log(``)

      // Choices
      const choices = [
        {
          name: `Back`,
          value: CommonCommands.back
        },
        {
          name: `All available extensions in the system`,
          value: this.systemExtensionsCommand
        }
      ]

      // The System project has nothing of its own to list: its extensions are
      // the bundled ones, which is what the option above shows.
      if (project.isSystem === false) {
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
          await this.systemProjectExtensions()
          break
        }

        case this.projectExtensionsCommand: {
          await this.userProjectExtensions(
                  store,
                  project)

          break
        }

        default: {
          console.log(`Invalid selection`)
        }
      }
    }
  }

  async run(store: ProjectStore, project: ProjectRecord) {

    // Start
    console.log(``)
    console.log(chalk.bold(`─── Do you want to specify a project? ───`))
    console.log(``)

    // Choices
    let choices = [
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

    // The menu was opened in the System project, so there is no current
    // directory to bind to and the option is not offered.
    if (project.isSystem === true) {
      choices = choices.filter(
        (choice) => choice.value !== this.currentDirCommand)
    }

    // Prompt
    const command = await select({
      message: `Select an option`,
      loop: false,
      pageSize: 10,
      choices: choices
    })

    // Get project by method
    let selectedProject: ProjectRecord =
      projectRegistryService.getSystemProject()

    switch (command) {

      case this.currentDirCommand: {
        selectedProject = project
        break
      }

      case this.listDirCommand: {
        const picked = await this.getProjectByList()

        // Back
        if (picked == null) {
          return
        }

        selectedProject = picked
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
            projectRegistryService.getStore(selectedProject),
            selectedProject)
  }

  async systemProjectExtensions() {

    // Debug
    const fnName = `${this.clName}.systemProjectExtensions()`

    // Get System project
    const systemProject = projectRegistryService.getSystemProject()

    // Get system extensions
    const systemStore = projectRegistryService.getStore(systemProject)

    const extensionsData = await
            extensionQueryService.loadExtensions(
              systemStore,
              systemProject.id)

    // Validate
    if (extensionsData == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsData == null'
      })
    }

    // Start
    console.log(``)
    console.log(chalk.bold(`─── Project: ${systemProject.name} ───`))
    console.log(``)

    // Choices, numbered so the extension is picked by position
    const choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      }
    ]

    const extensionsMap: Record<string, SourceNodeRecord> = {}

    let i = 1

    for (const extension of extensionsData.extensionNodes) {

      choices.push({
        name: extension.name,
        value: `${i}`
      })

      extensionsMap[`${i}`] = extension

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
    if (extensionsMap[command] != null) {

      await this.viewExtension(
              systemStore,
              systemProject,
              extensionsMap[command])
    }
  }

  async userProjectExtensions(
          store: ProjectStore,
          project: ProjectRecord) {

    // Debug
    const fnName = `${this.clName}.userProjectExtensions()`

    // Get project extensions
    const extensionsData = await
            extensionQueryService.loadExtensions(
              store,
              project.id)

    // Validate
    if (extensionsData == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsData == null'
      })
    }

    // Start
    console.log(``)
    console.log(chalk.bold(`─── Project: ${project.name} ───`))
    console.log(``)

    // Choices, numbered so the extension is picked by position
    const choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      }
    ]

    const extensionsMap: Record<string, SourceNodeRecord> = {}

    let i = 1

    for (const extension of extensionsData.extensionNodes) {

      choices.push({
        name: extension.name,
        value: `${i}`
      })

      extensionsMap[`${i}`] = extension

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
    if (extensionsMap[command] != null) {

      await this.viewExtension(
              store,
              project,
              extensionsMap[command])
    }
  }

  async viewExtension(
          store: ProjectStore,
          project: ProjectRecord,
          extensionNode: SourceNodeRecord) {

    // Start
    console.log(``)
    console.log(chalk.bold(`─── Project: ${project.name} ───`))
    console.log(chalk.bold(`─── Extension: ${extensionNode.name} ───`))
    console.log(``)

    // Choices
    const choices = [
      {
        name: `Back`,
        value: CommonCommands.back as string
      }
    ]

    // An extension is copied out of the System project, so the option only
    // makes sense there.
    if (project.isSystem === true) {

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
                store,
                extensionNode)

        break
      }

      case this.deleteExtensionCommand: {
        await extensionMutateService.deleteExtension(
                store,
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
