import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { CommonCommands } from '@/types/server-only-types.js'
import { ExtensionMutateService } from './mutate-service.js'
import { ExtensionQueryService } from './query-service.js'

// Services
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()

/**
 * The extensions a project has, and what can be done to them.
 *
 * A project's extensions are the ones its deps file names, loaded out of the
 * engine's bundled extensions, so there is nothing to choose from here beyond
 * what the project already has. An extension the project does not have is one
 * its deps file has to name first, which the `load-extensions` command does.
 */

// Class
export class ManageExtensionsCliService {

  // Consts
  clName = 'ManageExtensionsCliService'

  deleteExtensionCommand = '`delete'

  // Code
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

  /** What can be done to one of a project's extensions. */
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
        value: CommonCommands.back
      },
      {
        name: `Delete this extension`,
        value: this.deleteExtensionCommand
      }
    ]

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
