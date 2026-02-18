import fs from 'fs'
import chalk from 'chalk'
import { input, select } from '@inquirer/prompts'
import { Instance, PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { InstanceModel } from '@/serene-core-server/models/instances/instance-model'
import { CommonCommands, ServerOnlyTypes } from '@/types/server-only-types'
import { BuildMutateService } from '../intentcode/build/mutate-service'
import { IntentCodeAnalyzerChatService } from '../intentcode/analyzer/chat-service'
import { ProjectsMutateService } from './mutate-service'
import { ProjectsQueryService } from './query-service'
import { ProjectSetupService } from './setup-project'

// Models
const instanceModel = new InstanceModel()

// Services
const buildMutateService = new BuildMutateService()
const intentCodeAnalyzerChatService = new IntentCodeAnalyzerChatService()
const projectsMutateService = new ProjectsMutateService()
const projectsQueryService = new ProjectsQueryService()
const projectSetupService = new ProjectSetupService()

// Class
export class ProjectCliService {

  // Consts
  clName = 'ProjectCliService'

  aboutCommand = `about`
  chatCommand = `chat`
  runBuildCommand = `run-build`

  addProjectCommand = `add-project`

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
    console.log(``)

    // Get project name
    var projectName = await
      input({ message: `Enter the project name` })

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
    var projectPath = await
      input({ message: `Enter the project path` })

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


      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Back`,
            value: CommonCommands.back
          },
          {
            name: `About this project`,
            value: this.aboutCommand
          },
          {
            name: `Open a chat`,
            value: this.chatCommand
          },
          {
            name: `Run the build`,
            value: this.runBuildCommand
          }
        ]
      })

      // Handle selection
      switch (command) {

        case CommonCommands.back: {
          return
        }

        case this.aboutCommand: {
          await this.aboutProject(
            prisma,
            instance)

          break
        }

        case this.chatCommand: {
          await intentCodeAnalyzerChatService.openChat(
            prisma,
            instance)

          break
        }

        case this.runBuildCommand: {
          await buildMutateService.runBuild(
            prisma,
            instance.id,
            instance.name)

          break
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

      // Choices
      var choices = [
        {
          name: `Back`,
          value: CommonCommands.back
        },
        {
          name: `Add a project`,
          value: this.addProjectCommand
        }
      ]

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

        choices.push({
          name: instance.name,
          value: projectNo
        })
      }

      // Select
      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: choices
      })

      // Handle command
      if (command === this.addProjectCommand) {

        await this.addProject(
          prisma,
          adminUserProfile)

        continue

      } else if (command === CommonCommands.back) {
        return
      }

      // Project
      if (projectsMap.has(command)) {

        await this.project(
          prisma,
          adminUserProfile,
          projectsMap.get(command)!)
      }

      // Default
      console.log(`Invalid command`)
    }
  }
}
