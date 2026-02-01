import { PrismaClient } from '@prisma/client'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { AiModelCliReplService } from '@/serene-ai-server/services/setup/ai-cli-repl-service'
import { ServerTestTypes } from '@/types/server-test-types'
import { ProjectSetupService } from '../projects/setup-project'
import { LoadExternalExtensionsService } from '../extensions/extension/load-external-service'
import { ManageExtensionsCliService } from '../extensions/extension/cli-service'
import { SetupService } from './setup-service'
import { TestsService } from '../tests/tests-service'

// Services
const aiModelCliReplService = new AiModelCliReplService()
const consoleService = new ConsoleService()
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
  manageAiKeysCommand = 'manage-ai-keys'
  manageExtensionsCommand = 'manage-extensions'
  // loadTechProviderApiKeysCommand = 'load-tech-provider-api-keys'
  setupCommand = 'setup'
  testsCommand = 'tests'

  commands = [
    this.initProjectCommand,
    this.loadExtensionsCommand,
    this.manageAiKeysCommand,
    this.manageExtensionsCommand,
    // this.loadTechProviderApiKeysCommand,
    this.setupCommand,
    this.testsCommand
  ]

  commandsBySelection: Record<string, string> = {
    'i': this.initProjectCommand,
    'l': this.loadExtensionsCommand,
    'm': this.manageExtensionsCommand,
    'k': this.manageAiKeysCommand,
    's': this.setupCommand,
    't': this.testsCommand
  }

  // Code
  async menu(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.menu()`

    // REPL loop
    while (true) {

      // Show menu
      console.log(`[i] Init project`)
      console.log(`[l] Load extensions`)
      console.log(`[m] Manage extensions`)
      console.log(`[k] Manage AI keys`)
      console.log(`[s] Setup`)
      console.log(`[t] Tests`)
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

      case this.manageAiKeysCommand: {

        await aiModelCliReplService.main(prisma)
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

        await setupService.setup(
          prisma,
          adminUserProfile)

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
