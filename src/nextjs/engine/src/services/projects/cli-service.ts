import fs from 'fs'
import chalk from 'chalk'
import { Instance, PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { consoleService } from '@/serene-core-server/services/console/service'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { BuildMutateService } from '../intentcode/build/mutate-service'
import { ProjectsMutateService } from './mutate-service'
import { ProjectsQueryService } from './query-service'
import { ProjectSetupService } from './setup-project'

// Models
const instanceModel = new InstanceModel()

// Services
const buildMutateService = new BuildMutateService()
const projectsMutateService = new ProjectsMutateService()
const projectsQueryService = new ProjectsQueryService()
const projectSetupService = new ProjectSetupService()

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

    // Print project path
    const projectPath = await
      projectsQueryService.getProjectPath(
        prisma,
        instance.id)

    // Output
    console.log(``)
    console.log(`Path: ${projectPath}`)
  }

  async addProject(
    prisma: PrismaClient,
    adminUserProfile: UserProfile) {

    // Debug
    const fnName = `${this.clName}.project()`

    // Banner
    console.log(``)
    console.log(chalk.bold(`─── Add a project ───`))

    // Get project name
    console.log(``)
    console.log(`Enter the project name:`)

    var projectName = await
      consoleService.askQuestion('> ')

    projectName = projectName.trim()

    // Is there already a top-level project with this name?
    var instance = await
      instanceModel.getByParentIdAndName(
        prisma,
        null,       // parentId
        projectName)

    if (instance != null) {

      console.log(``)
      console.log(`Project ${instance.name} already exists`)

      return
    }

    // Get project path
    console.log(``)
    console.log(`Enter the project path:`)

    var projectPath = await
      consoleService.askQuestion('> ')

    projectPath = projectPath.trim()

    // Is there already a project with this path?
    instance = await
      projectsQueryService.getProjectByPath(
        prisma,
        projectPath)

    if (instance != null) {

      console.log(``)
      console.log(`Project ${instance.name} already exists for that path`)

      return
    }

    // Does the path exist
    if (fs.existsSync(projectPath) === false) {

      console.log(``)
      console.log(`The path doesn't exist, please create it first`)

      return
    }

    // Add the instance
    instance = await
      projectsMutateService.getOrCreate(
        prisma,
        adminUserProfile.id,
        projectName)

    // Setup project node
    const projectNode = await
      projectSetupService.setupProject(
        prisma,
        instance,
        instance.name,
        projectPath)
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

      // Get selection
      const selection = await
        consoleService.askQuestion('> ')

      // Handle selection
      switch (selection) {

        case 'a': {
          await this.aboutProject(
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

  async projects(
    prisma: PrismaClient,
    adminUserProfile: UserProfile) {

    // Debug
    const fnName = `${this.clName}.project()`

    // REPL loop
    while (true) {

      // Show menu
      console.log(``)
      console.log(chalk.bold(`─── Projects ───`))
      console.log(``)
      console.log(`[a] Add a project`)
      console.log(`[b] Back`)

      // Get projects
      var instances = await
        instanceModel.filter(prisma)

      // Validate
      if (instances == null) {
        throw new CustomError(`${fnName}: instances == null`)
      }

      // Filter out the System project
      instances = instances.filter(
        instance => instance.name !== ServerOnlyTypes.systemProjectName)

      // Sort by name
      instances.sort((a, b) => a.name.localeCompare(b.name))

      // Create projects
      var i = 1
      const projectsMap = new Map<string, Instance>()

      for (const instance of instances) {

        projectsMap.set(
          `${i}`,
          instance)

        i += 1
      }

      // List projects
      for (const [projectNo, instance] of projectsMap.entries()) {

        console.log(`[${projectNo}] ${instance.name}`)
      }

      // Get menu no
      const selection = await
        consoleService.askQuestion('> ')

      // Handle selection
      if (selection === 'a') {

        await this.addProject(
          prisma,
          adminUserProfile)

        continue

      } else if (selection === 'b') {
        return
      }

      // Project
      if (projectsMap.has(selection)) {

        await this.project(
          prisma,
          adminUserProfile,
          projectsMap.get(selection)!)
      }

      // Default
      console.log(`Invalid command`)
    }
  }
}
