#!/usr/bin/env node
//import nextEnv from '@next/env'
//const { loadEnvConfig } = nextEnv
import { loadEnvConfig } from '@next/env'

// Load the env file
const dev = process.env.NODE_ENV !== 'production'

loadEnvConfig(process.cwd(), dev);

import './services/setup/env-setup-service';

// Main
(async () => {

  // Imports
  // await import ('./services/setup/env-setup-service')
  const { prisma } = await import('@/db')
  const { CliService } = await import('./services/setup/cli-service')
  const { HousekeepingDeleteService } = await import('./services/housekeeping/delete-service')
  const { ProjectsQueryService } = await import('./services/projects/query-service')
  const { SetupService } = await import('./services/setup/setup-service')

  // Debug
  const fnName = 'cli.ts'

  // Services
  const cliService = new CliService()
  const housekeepingDeleteService = new HousekeepingDeleteService()
  const projectsQueryService = new ProjectsQueryService()
  const setupService = new SetupService()

  // Housekeeping
  await housekeepingDeleteService.deleteOldRecords(prisma)

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
