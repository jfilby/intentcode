import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { consoleService } from '@/serene-core-server/services/console/service'
import { AiTaskDetail, AiTasksService } from './ai-tasks-service'

// Services
const aiTasksService = new AiTasksService()

// Class
export class AiModelsCliReplService {

  // Consts
  clName = 'AiModelsCliReplService'

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
      console.log(`[b] Back`)

      // Get menu no
      const menuNo = await
        consoleService.askQuestion('> ')
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
      console.log(`[b] Back`)
      console.log(`[r] Reset to defaults`)

      for (const [menuNo, desc] of aiTaskMap.entries()) {

        console.log(`[${menuNo}] ${desc}`)
      }

      // Get menu no
      const menuNo = await
        consoleService.askQuestion('> ')

      // Handle back selection
      if (menuNo === 'b') {
        return

      } else if (menuNo === 'r') {

        /* await this.resetToDefaults(
          prisma,
          namespace,
          userProfileId) */
      }

      // Handle a selected AiTask
      if (aiTaskMap.has(menuNo)) {

        await this.changeModel(
          prisma,
          aiTaskMap.get(menuNo)!)

        continue
      }

      // Invalid option
      console.log(`Invalid selection`)
    }
  }
}
