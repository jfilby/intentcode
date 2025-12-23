// Load the env file
require('dotenv').config({ path: `./.env.${process.env.NODE_ENV}` })

// Requires/imports
import { prisma } from './db'
import { TechProviderMutateService } from '@/serene-core-server/services/tech/tech-provider-mutate-service'
import { UsersService } from '../deployed/serene-core-server/services/users/service'
import { ServerTestTypes } from './types/server-test-types'
import { SetupService } from './services/setup/setup'
import { TestsService } from './services/tests/tests-service'

// Main
(async () => {

  // Debug
  const fnName = 'cli.ts'

  // Consts
  const loadTechProviderApiKeysCommand = 'load-tech-provider-api-keys'
  const setupCommand = 'setup'
  const testsCommand = 'tests'

  const commands = [
          loadTechProviderApiKeysCommand,
          setupCommand,
          testsCommand
        ]

  // Test to run
  const command = process.argv[2]

  console.log(`${fnName}: comand to run: ${command}`)

  // Services
  const usersService = new UsersService()
  const setupService = new SetupService()
  const techProviderMutateService = new TechProviderMutateService()
  const testsService = new TestsService()

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

  // Run the chosen command
  switch (command) {

    case loadTechProviderApiKeysCommand: {

      await techProviderMutateService.cliLoadJsonStr(prisma)

      break
    }

    case setupCommand: {

      await setupService.setup(
              prisma,
              adminUserProfile)

      break
    }

    case testsCommand: {

      await testsService.tests(
              prisma,
              regularTestUserProfile,
              adminUserProfile)

      break
    }

    default: {

      console.log(`${fnName}: invalid command, selection is: ` +
                  JSON.stringify(commands))

      await prisma.$disconnect()
      process.exit(1)
    }
  }

  // Done
  await prisma.$disconnect()
  process.exit(0)
})()
