import path from 'path'

// Load the env file
const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env'

require('dotenv').config({ path: path.resolve(process.cwd(), envFile) })
require('./services/setup/env-setup-service.ts')

// Requires/imports
import { prisma } from './db'
import { CliService } from './services/setup/cli-service'
import { SetupService } from './services/setup/setup-service'

// Main
(async () => {

  // Debug
  const fnName = 'cli.ts'

  // Services
  const cliService = new CliService()
  const setupService = new SetupService()

  // Run setup if needed
  await setupService.setupIfRequired(prisma)

  // Run a command or show the menu
  if (process.argv.length >= 2 &&
      process.argv[2] != null) {

    // Run the chosen command
    await cliService.runCommand(
      prisma,
      process.argv[2])  // command

  } else {
    await cliService.menu(prisma)
  }

  // Done
  await prisma.$disconnect()
  process.exit(0)
})()
