import chalk from 'chalk'
import { Instance, PrismaClient, UserProfile } from '@prisma/client'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { BuildMutateService } from '../intentcode/build/mutate-service'
import { ProjectsQueryService } from './query-service'

// Services
const buildMutateService = new BuildMutateService()
const consoleService = new ConsoleService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class ProjectCliService {

  // Consts
  clName = 'ProjectCliService'

  // Code
  async aboutProject(
    prisma: PrismaClient,
    instance: Instance) {

    // Banner
    console.log(``)
    console.log(chalk.bold(`─── About project: ${instance.name} ───`))
    console.log(``)

    // Print project path
    const projectPath = await
      projectsQueryService.getProjectPath(
        prisma,
        instance.id)

    // Output
    console.log(`Path: ${projectPath}`)
  }

  async project(
    prisma: PrismaClient,
    adminUserProfile: UserProfile,
    instance: Instance) {

    // Debug
    const fnName = `${this.clName}.project()`

    // REPL loop
    while (true) {

      // Show menu
      console.log(``)
      console.log(chalk.bold(`─── Project: ${instance.name} ───`))
      console.log(``)
      console.log(`[a] About this project`)
      console.log(`[r] Run the build`)
      console.log(`[b] Back`)

      // Get menu no
      const selection = await
        consoleService.askQuestion('> ')

      // Handle selection
      switch (selection) {

        case 'a': {
          this.aboutProject(
            prisma,
            instance)

          break
        }

        case 'r': {
          await buildMutateService.runBuild(
            prisma,
            instance.id,
            instance.name)

          break
        }

        case 'b': {
          return
        }

        default: {
          console.log(`Invalid command`)
        }
      }
    }
  }
}
