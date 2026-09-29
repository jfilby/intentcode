/**
 * The main menu and the command dispatch.
 *
 * The commands are the same ones the CLI has always had. What changed is what
 * they run against: a project store and the project it belongs to, rather
 * than a database client. There is no user to provision and no housekeeping
 * to run, because nothing accumulates that has to be aged out — a chat that
 * is no longer wanted is a file the user deletes.
 */

import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { CommonCommands } from '@/types/server-only-types.js'
import { InfoService } from './info-service.js'
import { LoadExternalExtensionsService } from
  '../extensions/extension/load-external-service.js'
import { ManageExtensionsCliService } from
  '../extensions/extension/cli-service.js'
import { ProjectCliService } from '../projects/cli-service.js'
import { ProjectRegistryService } from '../projects/project-registry.js'
import { SetupService } from './setup-service.js'
import { TestsService } from '../tests/tests-service.js'

// Services
const infoService = new InfoService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const manageExtensionsCliService = new ManageExtensionsCliService()
const projectCliService = new ProjectCliService()
const projectRegistryService = new ProjectRegistryService()
const setupService = new SetupService()
const testsService = new TestsService()

export class CliService {

  clName = 'CliService'

  projectsCommand = 'projects'
  loadExtensionsCommand = 'load-extensions'
  manageExtensionsCommand = 'manage-extensions'
  setupCommand = 'setup'
  testsCommand = 'tests'
  infoCommand = 'info'

  commands = [
    this.projectsCommand,
    this.loadExtensionsCommand,
    this.manageExtensionsCommand,
    this.setupCommand,
    this.testsCommand,
    this.infoCommand,
    CommonCommands.exit
  ]

  /**
   * The menu loop. The project is resolved once at the top rather than on
   * every pass: the working directory does not change under a running menu,
   * and re-walking to the project root on each iteration is work whose answer
   * cannot differ.
   */
  async menu(store: ProjectStore, project: ProjectRecord) {

    console.log(``)
    console.log(chalk.bold(`─── IntentCode ───`))
    console.log(``)
    console.log(`Project: ${project.name} (${project.path})`)
    console.log(``)

    while (true) {

      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: [
          { name: `Projects`, value: this.projectsCommand },
          { name: `Load extensions`, value: this.loadExtensionsCommand },
          { name: `Manage extensions`, value: this.manageExtensionsCommand },
          { name: `Setup`, value: this.setupCommand },
          { name: `Tests`, value: this.testsCommand },
          { name: `Info`, value: this.infoCommand },
          { name: `Exit`, value: CommonCommands.exit }
        ]
      })

      if (command === CommonCommands.exit) return

      if (command != null) {
        await this.runCommand(store, project, command)
      }
    }
  }

  async runCommand(
    store: ProjectStore,
    project: ProjectRecord,
    command: string
  ) {

    // Debug
    const fnName = `${this.clName}.runCommand()`

    // Output
    console.log(`${fnName}: command to run: ${command}`)

    switch (command) {

      case this.infoCommand: {
        await infoService.info(store, project)
        break
      }

      case this.projectsCommand: {
        await projectCliService.projects()
        break
      }

      case this.loadExtensionsCommand: {
        await loadExternalExtensionsService.promptForAndLoadPath(store, project)
        break
      }

      case this.manageExtensionsCommand: {
        await manageExtensionsCliService.run(store, project)
        break
      }

      case this.setupCommand: {
        await setupService.setup(store)
        break
      }

      case this.testsCommand: {
        await testsService.tests(store, project)
        break
      }

      default: {
        throw new IntentError({
          category: 'ValidationError',
          stage: fnName,
          message: `invalid command: ${command}`,
          detail: `known commands: ${this.commands.join(', ')}`
        })
      }
    }
  }

  /** The System project, for a command that reads the bundled extensions. */
  getSystemStore() {
    const system = projectRegistryService.getSystemProject()
    return projectRegistryService.getStore(system)
  }
}
