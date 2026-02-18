import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { Instance, PrismaClient } from '@prisma/client'
import { UsersService } from '@/serene-core-server/services/users/service'
import { AiKeysCliReplService } from '@/serene-ai-server/services/setup/ai-keys-cli-repl-service'
import { CommonCommands } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { AiModelsSelectionService } from './ai-models-selection-service'
import { InfoService } from './info-service'
import { LoadExternalExtensionsService } from '../extensions/extension/load-external-service'
import { ManageExtensionsCliService } from '../extensions/extension/cli-service'
import { ProjectsQueryService } from '../projects/query-service'
import { ProjectCliService } from '../projects/cli-service'
import { SetupService } from './setup-service'
import { TestsService } from '../tests/tests-service'

// Services
const aiKeysCliReplService = new AiKeysCliReplService()
const aiModelsSelectionService = new AiModelsSelectionService()
const infoService = new InfoService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const manageExtensionsCliService = new ManageExtensionsCliService()
const projectsQueryService = new ProjectsQueryService()
const projectCliService = new ProjectCliService()
const setupService = new SetupService()
const testsService = new TestsService()
const usersService = new UsersService()

// Class
export class CliService {

  // Consts
  clName = 'CliService'

  projectsCommand = 'projects'
  loadExtensionsCommand = 'load-extensions'
  manageAiModelsCommand = 'manage-ai-models'
  manageAiKeysCommand = 'manage-ai-keys'
  manageExtensionsCommand = 'manage-extensions'
  // loadTechProviderApiKeysCommand = 'load-tech-provider-api-keys'
  setupCommand = 'setup'
  testsCommand = 'tests'
  infoCommand = 'info'

  commands = [
    this.projectsCommand,
    this.loadExtensionsCommand,
    this.manageAiModelsCommand,
    this.manageAiKeysCommand,
    this.manageExtensionsCommand,
    // this.loadTechProviderApiKeysCommand,
    this.setupCommand,
    this.testsCommand,
    this.infoCommand,
    CommonCommands.exit
  ]

  // Code
  async menu(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.menu()`

    // REPL loop
    while (true) {

      // Try to get a project in the cwd
      const project = await
        projectsQueryService.getProjectByPath(
          prisma,
          process.cwd())

      // Show menu
      console.log(``)
      console.log(chalk.bold(`─── Main menu ───`))
      console.log(``)

      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Projects`,
            value: this.projectsCommand
          },
          {
            name: `Load extensions`,
            value: this.loadExtensionsCommand
          },
          {
            name: `Manage extensions`,
            value: this.manageExtensionsCommand
          },
          {
            name: `Manage AI models`,
            value: this.manageAiModelsCommand
          },
          {
            name: `Manage AI keys`,
            value: this.manageAiKeysCommand
          },
          {
            name: `Setup`,
            value: this.setupCommand
          },
          {
            name: `Tests`,
            value: this.testsCommand
          },
          {
            name: `Info`,
            value: this.infoCommand
          },
          {
            name: `Exit`,
            value: CommonCommands.exit
          }
        ]
      })

      // Exit?
      if (command === CommonCommands.exit) {
        return
      }

      // Run command
      if (command != null) {

        await this.runCommand(
          prisma,
          command,
          project)
      }
    }
  }

  async runCommand(
    prisma: PrismaClient,
    command: string,
    project: Instance | null) {

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

      case this.projectsCommand: {

        await projectCliService.projects(
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
