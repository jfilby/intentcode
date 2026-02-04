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
import { ProjectsQueryService } from './services/projects/query-service'
import { SetupService } from './services/setup/setup-service'

// Main
(async () => {

  // Debug
  const fnName = 'cli.ts'

  // Services
  const cliService = new CliService()
  const projectsQueryService = new ProjectsQueryService()
  const setupService = new SetupService()

  // Run setup if needed
  await setupService.setupIfRequired(prisma)

  // Run a command or show the menu
  if (process.argv.length >= 2 &&
      process.argv[2] != null) {

    // Try to get a project in the cwd
    const project = await
      projectsQueryService.getProjectByPath(
        prisma,
        process.cwd())

    // Run the chosen command
    await cliService.runCommand(
      prisma,
      process.argv[2],  // command
      project)

  } else {
    await cliService.menu(prisma)
  }

  // Done
  await prisma.$disconnect()
  process.exit(0)
})()
