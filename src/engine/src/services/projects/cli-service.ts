/**
 * The Projects menu.
 *
 * Projects are directories, so this menu does two things: it lists the ones
 * under the working directory, and it creates one. Creating a project writes
 * an `intent.toml`; there is no registry to add an entry to, so a project
 * created here is on disk immediately and is found by walking up from any
 * directory inside it.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { input, select } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord } from '@/core/records.js'
import { CommonCommands } from '@/types/server-only-types.js'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { IntentCodeAnalyzerChatService } from
  '../intentcode/analyzer/chat-service.js'
import { ProjectRegistryService } from './project-registry.js'

// Services
const buildMutateService = new BuildMutateService()
const intentCodeAnalyzerChatService = new IntentCodeAnalyzerChatService()
const projectRegistryService = new ProjectRegistryService()

export class ProjectCliService {

  clName = 'ProjectCliService'

  aboutCommand = 'about'
  chatCommand = 'chat'
  runBuildCommand = 'run-build'

  addProjectCommand = 'add-project'

  /** The project picker. Selecting one opens that project's own menu. */
  async projects() {

    const projects = await projectRegistryService.getProjectList()

    const choices = [
      ...projects.map((project, index) => ({
        name: `${index + 1}. ${project.name} — ${project.path}`,
        value: project.path
      })),
      { name: `Add a project`, value: this.addProjectCommand },
      { name: `Back`, value: CommonCommands.back }
    ]

    const selected = await select({
      message: `Projects`,
      loop: false,
      pageSize: 15,
      choices
    })

    if (selected == null || selected === CommonCommands.back) return

    if (selected === this.addProjectCommand) {
      await this.addProject()
      return
    }

    const project = await projectRegistryService.getProjectByRoot(selected)

    await this.project(project)
  }

  /**
   * Creates a project: asks for a directory and a name, and writes the
   * intent.toml. Both are asked for separately because the name is what the
   * project is called in every prompt the compiler writes, and it does not
   * have to match the directory it lives in.
   */
  async addProject(): Promise<ProjectRecord | undefined> {

    // Debug
    const fnName = `${this.clName}.addProject()`

    const pathInput = await input({
      message: `Project path (a directory that exists)`
    })

    const path = resolve(pathInput.trim())

    if (existsSync(path) === false) {
      throw new IntentError({
        category: 'ProjectError',
        stage: fnName,
        message: `no directory at ${path}`,
        detail: 'a project is a directory that already exists; create it ' +
          'first, then add it here'
      })
    }

    const nameInput = await input({
      message: `Project name`,
      default: path.split(/[\\/]/).filter((part) => part !== '').pop()
    })

    const name = nameInput.trim()

    const project = await projectRegistryService.createProject(path, name)

    console.log(``)
    console.log(`Created project "${project.name}" at ${project.path}`)
    console.log(``)

    return project
  }

  /** One project's menu. */
  async project(project: ProjectRecord) {

    const store = projectRegistryService.getStore(project)

    while (true) {

      const command = await select({
        message: `${project.name}`,
        loop: false,
        pageSize: 10,
        choices: [
          { name: `About this project`, value: this.aboutCommand },
          { name: `Open a chat`, value: this.chatCommand },
          { name: `Run the build`, value: this.runBuildCommand },
          { name: `Back`, value: CommonCommands.back }
        ]
      })

      if (command == null || command === CommonCommands.back) return

      switch (command) {

        case this.aboutCommand: {
          this.aboutProject(project)
          break
        }

        case this.chatCommand: {
          await intentCodeAnalyzerChatService.openChat(store, project)
          break
        }

        case this.runBuildCommand: {
          await buildMutateService.runBuild(store, project.id, project.name)
          break
        }

        default: {
          throw new IntentError({
            category: 'ValidationError',
            stage: `${this.clName}.project()`,
            message: `invalid command: ${String(command)}`
          })
        }
      }
    }
  }

  aboutProject(project: ProjectRecord) {

    console.log(``)
    console.log(chalk.bold(`# ${project.name}`))
    console.log(``)
    console.log(`Path: ${project.path}`)
    console.log(`Key: ${project.key}`)
    console.log(``)
  }
}
