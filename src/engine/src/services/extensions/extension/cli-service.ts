import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord, SourceNodeRecord } from '@/core/records.js'
import { createProjectStore, type ProjectStore } from '@/core/store.js'
import { CommonCommands } from '@/types/server-only-types.js'
import { ExtensionMutateService } from './mutate-service.js'
import { ExtensionQueryService } from './query-service.js'
import { GraphsMutateService } from '@/services/graphs/general/mutate-service.js'
import { getSystemProject, getSystemStore } from
  '@/services/projects/system-project.js'

// Services
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const graphsMutateService = new GraphsMutateService()

// Class
export class ManageExtensionsCliService {

  // Consts
  clName = 'ManageExtensionsCliService'

  projectExtensionsCommand = 'project'
  systemExtensionsCommand = 'system'


  loadExtensionIntoProjectCommand = 'load'
  deleteExtensionCommand = '`delete'

  // Code

  /**
   * Copies an extension out of the System project into the project the
   * command was run in. The two are separate stores, so the System one is
   * named here rather than taken from the caller: the caller may be looking
   * at the System project itself.
   */
  async loadExtensionIntoProject(
          systemStore: ProjectStore,
          project: ProjectRecord,
          extensionNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.loadExtensionIntoProject()`

    // Start
    console.log(``)
    console.log(`Load extension: ${extensionNode.name} into ${project.name}`)
    console.log(`---`)

    // Get the store and extensions node of the project
    const loadToStore = createProjectStore(project.path)

    const extensionsNode = await
          extensionMutateService.getOrCreateExtensionsNode(
            loadToStore,
            project.id)

    // Validate
    if (extensionsNode == null) {
      throw new IntentError({
        category: 'ExtensionError',
        stage: fnName,
        message: 'extensionsNode == null'
      })
    }

    // Load the Extension into the project
    await graphsMutateService.copyNodesToProject(
            systemStore,
            loadToStore,
            project.id,
            extensionNode.id,
            extensionsNode.id)  // parentToNodeId

    console.log(``)
    console.log(`Extension copied OK`)
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
        },
        {
          name: `Enabled extensions for this project`,
          value: this.projectExtensionsCommand
        }
      ]

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
          await this.systemProjectExtensions(project)
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

  /**
   * The System project's extensions, with the project the command was run in
   * as the place one of them can be copied into: an extension is loaded into
   * the System project and copied out into a project, so this is the only
   * place the copy can be offered.
   */
  async systemProjectExtensions(loadInto: ProjectRecord) {

    // Debug
    const fnName = `${this.clName}.systemProjectExtensions()`

    // Get System project
    const systemProject = getSystemProject()

    // Get system extensions
    const systemStore = getSystemStore()
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
              extensionsMap[command],
              loadInto)
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

  /**
   * One extension's actions. `loadInto` is the project an extension held by
   * the System project can be copied into; it is absent when the extension
   * already belongs to the project being viewed.
   */
  async viewExtension(
          store: ProjectStore,
          project: ProjectRecord,
          extensionNode: SourceNodeRecord,
          loadInto?: ProjectRecord) {

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

    if (loadInto != null) {

      choices.push({
        name: `Load extension into ${loadInto.name}`,
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
                loadInto as ProjectRecord,
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
