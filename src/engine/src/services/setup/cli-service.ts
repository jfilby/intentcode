/**
 * The command dispatch.
 *
 * There is no menu: every command is an argument, and the CLI runs the one it
 * is given and exits. A command that needs a project is handed the project
 * the working directory is in, or the one at the directory named after the
 * command.
 *
 * `build` is the exception, and deliberately so. A build writes compiled
 * source over the project's own files, so it runs against the project in the
 * directory it was given and nothing else: a directory without an
 * `intent.toml` is reported as not being a project rather than quietly
 * building whatever project happens to be above it.
 */

import { IntentError } from '@/core/errors.js'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { IntentCodeAnalyzerChatService } from
  '../intentcode/analyzer/chat-service.js'
import { InfoService } from './info-service.js'
import { LoadExternalExtensionsService } from
  '../extensions/extension/load-external-service.js'
import { ManageExtensionsCliService } from
  '../extensions/extension/cli-service.js'
import { ProjectRegistryService } from '../projects/project-registry.js'
import { SetupService } from './setup-service.js'
import { TestsService } from '../tests/tests-service.js'

// Services
const buildMutateService = new BuildMutateService()
const infoService = new InfoService()
const intentCodeAnalyzerChatService = new IntentCodeAnalyzerChatService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const manageExtensionsCliService = new ManageExtensionsCliService()
const projectRegistryService = new ProjectRegistryService()
const setupService = new SetupService()
const testsService = new TestsService()

export class CliService {

  clName = 'CliService'

  buildCommand = 'build'
  chatCommand = 'chat'
  aboutCommand = 'about'
  loadExtensionsCommand = 'load-extensions'
  manageExtensionsCommand = 'manage-extensions'
  setupCommand = 'setup'
  testsCommand = 'tests'
  infoCommand = 'info'

  commands = [
    this.buildCommand,
    this.chatCommand,
    this.aboutCommand,
    this.loadExtensionsCommand,
    this.manageExtensionsCommand,
    this.setupCommand,
    this.testsCommand,
    this.infoCommand
  ]

  /** What to print when the CLI is run with no command to run. */
  usage(): string {
    return `Usage:\n` +
      `  intent <command>        run one command against the project ` +
      `containing\n` +
      `                          the working directory, and exit\n` +
      `  intent <command> <dir>  run it against the project at <dir>\n` +
      `\n` +
      `Commands:\n` +
      `  build            build the project in the working directory\n` +
      `  chat             chat about the project's Intent files\n` +
      `  about            print the project the command resolved to\n` +
      `  load-extensions  copy extensions into the project\n` +
      `  manage-extensions  list, load and delete the project's extensions\n` +
      `  setup            set the project up\n` +
      `  tests            run the bundled example builds\n` +
      `  info             print the models and settings in use`
  }

  /**
   * Runs one command. The store and the project are the ones the directory the
   * command is aimed at belongs to; `dir` is that directory itself, which is
   * what a build has to resolve rather than inherit.
   */
  async runCommand(
    store: ProjectStore,
    project: ProjectRecord,
    command: string,
    dir: string
  ) {

    // Debug
    const fnName = `${this.clName}.runCommand()`

    // Output
    console.log(`${fnName}: command to run: ${command}`)

    switch (command) {

      case this.buildCommand: {
        const buildProject = await projectRegistryService.getProjectInDir(dir)
        await buildMutateService.runBuild(
          projectRegistryService.getStore(buildProject),
          buildProject.id,
          buildProject.name)
        break
      }

      case this.chatCommand: {
        await intentCodeAnalyzerChatService.openChat(store, project)
        break
      }

      case this.aboutCommand: {
        infoService.about(project)
        break
      }

      case this.infoCommand: {
        await infoService.info(store, project)
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
        await testsService.tests()
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
