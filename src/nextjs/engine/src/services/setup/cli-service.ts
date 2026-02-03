import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { AiKeysCliReplService } from '@/serene-ai-server/services/setup/ai-keys-cli-repl-service'
import { ServerTestTypes } from '@/types/server-test-types'
import { AiModelsSelectionService } from './ai-models-selection-service'
import { InfoService } from './info-service'
import { LoadExternalExtensionsService } from '../extensions/extension/load-external-service'
import { ManageExtensionsCliService } from '../extensions/extension/cli-service'
import { ProjectSetupService } from '../projects/setup-project'
import { SetupService } from './setup-service'
import { TestsService } from '../tests/tests-service'

// Services
const aiKeysCliReplService = new AiKeysCliReplService()
const aiModelsSelectionService = new AiModelsSelectionService()
const consoleService = new ConsoleService()
const infoService = new InfoService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const manageExtensionsCliService = new ManageExtensionsCliService()
const projectSetupService = new ProjectSetupService()
const setupService = new SetupService()
const testsService = new TestsService()
const usersService = new UsersService()

// Class
export class CliService {

  // Consts
  clName = 'CliService'

  initProjectCommand = 'init-project'
  loadExtensionsCommand = 'load-extensions'
  manageAiModelsCommand = 'manage-ai-models'
  manageAiKeysCommand = 'manage-ai-keys'
  manageExtensionsCommand = 'manage-extensions'
  // loadTechProviderApiKeysCommand = 'load-tech-provider-api-keys'
  setupCommand = 'setup'
  testsCommand = 'tests'
  infoCommand = 'info'

  commands = [
    this.initProjectCommand,
    this.loadExtensionsCommand,
    this.manageAiModelsCommand,
    this.manageAiKeysCommand,
    this.manageExtensionsCommand,
    // this.loadTechProviderApiKeysCommand,
    this.setupCommand,
    this.testsCommand,
    this.infoCommand
  ]

  commandsBySelection: Record<string, string> = {
    'i': this.initProjectCommand,
    'l': this.loadExtensionsCommand,
    'm': this.manageExtensionsCommand,
    'a': this.manageAiModelsCommand,
    'k': this.manageAiKeysCommand,
    's': this.setupCommand,
    't': this.testsCommand,
    'n': this.infoCommand
  }

  // Code
  async menu(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.menu()`

    // REPL loop
    while (true) {

      // Show menu
      console.log(``)
      console.log(chalk.bold(`─── Main menu ───`))
      console.log(``)
      console.log(`[i] Init project`)
      console.log(`[l] Load extensions`)
      console.log(`[m] Manage extensions`)
      console.log(`[a] Manage AI models`)
      console.log(`[k] Manage AI keys`)
      console.log(`[s] Setup`)
      console.log(`[t] Tests`)
      console.log(`[n] Info`)
      console.log(`[x] Exit`)

      // Get menu no
      const menuNo = await
        consoleService.askQuestion('> ')

      // Exit?
      if (menuNo === 'x') {
        return
      }

      // Get command by menu no
      const command = this.commandsBySelection[menuNo]

      // Run command
      if (command != null) {

        await this.runCommand(
          prisma,
          command)
      }
    }
  }

  async runCommand(
    prisma: PrismaClient,
    command: string) {

    // Debug
    const fnName = `${this.clName}.runCommand()`

    // Output
    console.log(`${fnName}: comand to run: ${command}`)

    // Get/create an admin user
    const adminUserProfile = await
            usersService.getOrCreateUserByEmail(
              prisma,
              ServerTestTypes.adminUserEmail,
              undefined)  // defaultUserPreferences

    // Get/create a regular (non-admin) user
    const regularTestUserProfile = await
            usersService.getOrCreateUserByEmail(
              prisma,
              ServerTestTypes.regularTestUserEmail,
              undefined)  // defaultUserPreferences

    // Handle command to run
    switch (command) {

      case this.infoCommand: {

        await infoService.info()

        break
      }

      case this.initProjectCommand: {

        await projectSetupService.initProjectFromCli(
          prisma,
          adminUserProfile)

        break
      }

      case this.loadExtensionsCommand: {

        await loadExternalExtensionsService.promptForAndLoadPath(prisma)

        break
      }

      case this.manageAiModelsCommand: {

        await aiModelsSelectionService.main(prisma)
        break
      }

      case this.manageAiKeysCommand: {

        await aiKeysCliReplService.main(prisma)
        break
      }

      case this.manageExtensionsCommand: {

        await manageExtensionsCliService.run(prisma)

        break
      }

      /* case this.loadTechProviderApiKeysCommand: {
  
        await techProviderMutateService.cliLoadJsonStr(prisma)
  
        break
      } */

      case this.setupCommand: {

        await setupService.setup(prisma)

        break
      }

      case this.testsCommand: {

        await testsService.tests(
          prisma,
          regularTestUserProfile,
          adminUserProfile)

        break
      }

      default: {

        console.log(`${fnName}: invalid command, selection is: ` +
          JSON.stringify(this.commands))

        await prisma.$disconnect()
        process.exit(1)
      }
    }
  }
}
