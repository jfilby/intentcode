/**
 * The command dispatch.
 *
 * There is no menu: every command is an argument, and the CLI runs the one it
 * is given and exits. Every command is handed the same project, the one whose
 * intent.toml is in the working directory, because that is the only project
 * there is to run against.
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
import { ProjectSetupService } from '../projects/setup-project.js'
import { SetupService } from './setup-service.js'
import { TestsService } from '../tests/tests-service.js'

// Services
const buildMutateService = new BuildMutateService()
const infoService = new InfoService()
const intentCodeAnalyzerChatService = new IntentCodeAnalyzerChatService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const manageExtensionsCliService = new ManageExtensionsCliService()
const projectSetupService = new ProjectSetupService()
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
      `  intent <command>  run one command against the project in the ` +
      `working\n` +
      `                     directory, and exit\n` +
      `\n` +
      `A project is the directory holding the intent.toml, so the command ` +
      `has to be\n` +
      `run from inside it.\n` +
      `\n` +
      `Commands:\n` +
      `  build              build the project\n` +
      `  chat               chat about the project's Intent files\n` +
      `  about              print the project the command resolved to\n` +
      `  load-extensions    copy extensions into the project\n` +
      `  manage-extensions  list and delete the project's extensions\n` +
      `  setup              set the project up\n` +
      `  tests              run the example builds\n` +
      `  info               print the models and settings in use`
  }

  /**
   * Runs one command against the project the working directory is in. A build
   * lays the project's nodes out first: the graph is derived state, so a
   * project built for the first time has none of it yet.
   *
   * `extensionsPath` is the directory `load-extensions` was given. It is
   * passed in rather than asked for here because the CLI asks before the
   * sandbox is entered: a path outside the project is not reachable from
   * inside one unless the sandbox binds it.
   */
  async runCommand(
    store: ProjectStore,
    project: ProjectRecord,
    command: string,
    extensionsPath?: string
  ) {

    // Debug
    const fnName = `${this.clName}.runCommand()`

    // Output
    console.log(`${fnName}: command to run: ${command}`)

    switch (command) {

      case this.buildCommand: {
        await projectSetupService.setupProject(store, project)
        await buildMutateService.runBuild(store, project.id, project.name)
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

        // The CLI asks for the path before the sandbox is entered, so the
        // command arriving here without one is a dispatch called wrong rather
        // than a person who left the prompt unanswered.
        if (extensionsPath == null) {
          throw new IntentError({
            category: 'ValidationError',
            stage: fnName,
            message: `no path to load extensions from`
          })
        }

        await loadExternalExtensionsService.loadExtensionsInPath(
          store, project.id, extensionsPath)
        break
      }

      case this.manageExtensionsCommand: {
        await manageExtensionsCliService.userProjectExtensions(store, project)
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
}
