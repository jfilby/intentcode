import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { consoleService } from '@/serene-core-server/services/console/service'
import { AiTechDefs } from '@/serene-ai-server/types/tech-defs'
import { AiTaskModel } from '@/serene-ai-server/models/ai-tasks/ai-task-model'
import { AiTaskTechModel } from '@/serene-ai-server/models/ai-tasks/ai-task-tech-model'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { AiTaskModelPresets, IntentCodeAiTasks, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types'

// Models
const aiTaskModel = new AiTaskModel()
const aiTaskTechModel = new AiTaskTechModel()
const techModel = new TechModel()

// Class
export class AiModelsSelectionService {

  // Consts
  clName = 'AiModelsSelectionService'

  // Code
  async getCurModelPreset(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.getCurModelPreset()`

    // Get the AI task for compiler
    const compilerAiTask = await
      aiTaskModel.getByUniqueKey(
        prisma,
        ServerOnlyTypes.namespace,
        IntentCodeAiTasks.compiler)

    if (compilerAiTask == null) {
      throw new CustomError(`${fnName}: compilerAiTask == null`)
    }

    // Get the AI task model for the compiler
    const aiTaskTech = await
      aiTaskTechModel.getByUniqueKey(
        prisma,
        compilerAiTask.id,
        null)  // userProfileId

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: aiTaskTech?.tech: ` +
        JSON.stringify(aiTaskTech?.tech))
    }

    // Validate
    if (aiTaskTech?.tech == null) {
      return ``
    }

    // Return a selection
    switch (aiTaskTech.tech.variantName) {

      case AiTechDefs.googleGemini_V3ProFree: {
        return '1'
      }

      case AiTechDefs.googleGemini_V3Pro: {
        return '2'
      }

      case AiTechDefs.openAi_Gpt5pt2: {
        return '3'
      }

      default: {
        return ``
      }
    }
  }

  async main(prisma: PrismaClient) {

    // REPL loop
    while (true) {

      // Get current selection
      const curModelPreset = await
        this.getCurModelPreset(prisma)

      // Banner and options
      console.log(``)
      console.log(chalk.bold(`─── AI models selection ───`))
      console.log(``)
      console.log(`[b] Back`)

      if (curModelPreset === '1') {
        console.log(chalk.bold(`[1] Gemini 3-based (free) - selected`))
      } else {
        console.log(`[1] Gemini 3-based (free)`)
      }

      if (curModelPreset === '2') {
        console.log(chalk.bold(`[2] Gemini 3-based (paid) - selected`))
      } else {
        console.log(`[2] Gemini 3-based (paid)`)
      }

      if (curModelPreset === '3') {
        console.log(chalk.bold(`[3] GPT 5-2-based - selected`))
      } else {
        console.log(`[3] GPT 5-2-based`)
      }

      // Get menu no
      const menuNo = await
        consoleService.askQuestion('> ')

      // Handle back selection
      switch (menuNo) {

        case 'b': {
          return
        }

        case '1': {
          await this.setModels(
            prisma,
            AiTaskModelPresets.gemini3BasedFree)

          break
        }

        case '2': {
          await this.setModels(
            prisma,
            AiTaskModelPresets.gemini3BasedPaid)

          break
        }

        case '3': {
          await this.setModels(
            prisma,
            AiTaskModelPresets.gpt5pt2Based)

          break
        }

        default: {
          console.log(`Invalid selection`)
        }
      }
    }
  }

  async setupAiTasksWithDefaults(prisma: PrismaClient) {

    // Setup AI tasks
    await aiTaskModel.upsert(
      prisma,
      undefined,  // id
      BaseDataTypes.activeStatus,
      ServerOnlyTypes.namespace,
      IntentCodeAiTasks.compiler)

    await aiTaskModel.upsert(
      prisma,
      undefined,  // id
      BaseDataTypes.activeStatus,
      ServerOnlyTypes.namespace,
      IntentCodeAiTasks.indexer)

    // Defaults
    await this.setModels(
      prisma,
      AiTaskModelPresets.gemini3BasedFree)
  }

  async setModels(
    prisma: PrismaClient,
    aiTaskModelPreset: AiTaskModelPresets) {

    // Debug
    const fnName = `${this.clName}.setModels()`

    // Get the AI tasks
    const compilerAiTask = await
      aiTaskModel.getByUniqueKey(
        prisma,
        ServerOnlyTypes.namespace,
        IntentCodeAiTasks.compiler)

    if (compilerAiTask == null) {
      throw new CustomError(`${fnName}: compilerAiTask == null`)
    }

    const indexerAiTask = await
      aiTaskModel.getByUniqueKey(
        prisma,
        ServerOnlyTypes.namespace,
        IntentCodeAiTasks.indexer)

    if (indexerAiTask == null) {
      throw new CustomError(`${fnName}: indexerAiTask == null`)
    }

    // Get compiler model Tech record
    const compilerTech = await
      techModel.getByVariantName(
        prisma,
        ServerOnlyTypes.compilerModels[aiTaskModelPreset])

    // Validate
    if (compilerTech == null) {
      throw new CustomError(`${fnName}: compilerTech == null for ` +
        ServerOnlyTypes.compilerModels[aiTaskModelPreset])
    }

    // Get indexer model Tech record
    const indexerTech = await
      techModel.getByVariantName(
        prisma,
        ServerOnlyTypes.indexerModels[aiTaskModelPreset])

    // Validate
    if (indexerTech == null) {
      throw new CustomError(`${fnName}: indexerTech == null for ` +
        ServerOnlyTypes.indexerModels[aiTaskModelPreset])
    }

    // Set model for the compiler
    await aiTaskTechModel.upsert(
      prisma,
      undefined,  // id
      compilerAiTask.id,
      compilerTech.id,
      null)       // userProfileId

    // Set model for the indexer
    await aiTaskTechModel.upsert(
      prisma,
      undefined,  // id
      indexerAiTask.id,
      indexerTech.id,
      null)       // userProfileId

    // Output
    console.log(`Models updated`)
  }
}
