import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { PrismaClient } from '@prisma/client'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { AiTaskDetail, AiTasksService } from './ai-tasks-service'

// Services
const aiTasksService = new AiTasksService()

// Class
export class AiModelsCliReplService {

  // Consts
  clName = 'AiModelsCliReplService'

  backCommand = 'back'
  resetCommand = 'reset'

  // Code
  async changeModel(
          prisma: PrismaClient,
          aiTaskDetail: AiTaskDetail) {

    // REPL loop
    while (true) {

      // Get available models
      const modelsMap =
        this.getModelsMap()

      // Banner and options
      console.log(``)
      console.log(chalk.bold(`─── AI model for ${aiTaskDetail.description} ───`))
      console.log(``)

      // Prompt
      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Back`,
            value: this.backCommand
          }
        ]
      })
    }
  }

  getModelsMap() {

    // TODO:
    // 1. Only list models for providers of currently loaded AI keys.
    // 2. Only list the latest models. This will require extra defs in AiTechDefs. */
    const modelsMap = new Map<string, string>()

    // Return
    return modelsMap
  }

  async main(
    prisma: PrismaClient,
    namespace: string,
    userProfileId: string | null) {

    // REPL loop
    while (true) {

      // Get AI tasks and their tech
      const aiTaskMap = await
        aiTasksService.getNumberedTechMap(
          prisma,
          SereneCoreServerTypes.activeStatus,
          namespace,
          userProfileId)

      // Banner and options
      console.log(``)
      console.log(chalk.bold(`─── AI models maintenance ───`))
      console.log(``)

      // Choices
      const choices = [
        {
          name: `Back`,
          value: this.backCommand as string
        },
        {
          name: `Reset`,
          value: this.resetCommand
        }
      ]

      for (const [menuNo, desc] of aiTaskMap.entries()) {

        choices.push({
          name: desc as any as string,
          value: `${menuNo}`
        })
      }

      // Prompt
      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Back`,
            value: this.backCommand
          }
        ]
      })

      // Handle back selection
      if (command === this.backCommand) {
        return

      } else if (command === this.resetCommand) {

        /* await this.resetToDefaults(
          prisma,
          namespace,
          userProfileId) */
      }

      // Handle a selected AiTask
      if (aiTaskMap.has(command)) {

        await this.changeModel(
          prisma,
          aiTaskMap.get(command)!)

        continue
      }

      // Invalid option
      console.log(`Invalid selection`)
    }
  }
}
