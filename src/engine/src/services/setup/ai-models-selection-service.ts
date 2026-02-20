import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { AiTechDefs } from '@/serene-ai-server/types/tech-defs'
import { AiTaskModel } from '@/serene-ai-server/models/ai-tasks/ai-task-model'
import { AiTaskTechModel } from '@/serene-ai-server/models/ai-tasks/ai-task-tech-model'
import { BaseDataTypes } from '@/types/base-data-types'
import { AiTaskModelPresets, CommonCommands, IntentCodeAiTasks, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types'

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

    // Return variantName
    return aiTaskTech.tech.variantName
  }

  async main(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.main()`

    // REPL loop
    while (true) {

      // Get current selection
      const curModelPreset = await
        this.getCurModelPreset(prisma)

      // Banner and options
      console.log(``)
      console.log(chalk.bold(`─── AI models selection ───`))
      console.log(``)

      // Debug
      // console.log(`${fnName}: curModelPreset: ${curModelPreset}`)

      // Determine choices
      var choices = [
        {
            name: `Back`,
            value: CommonCommands.back
        },
        {
          name: `Amazon Nova 2-based (paid)`,
          value: AiTechDefs.amazonNova_V2Pro
        },
        {
          name: `Gemini 3.1-based (free)`,
          value: AiTechDefs.googleGemini_V3pt1ProFree
        },
        {
          name: `Gemini 3.1-based (paid)`,
          value: AiTechDefs.googleGemini_V3pt1Pro
        },
        {
          name: `GPT 5-2 (paid)`,
          value: AiTechDefs.openAi_Gpt5pt2
        }
      ]

      // Bold the current choice
      for (const choice of choices) {

        if (choice.value === curModelPreset) {
          choice.name = chalk.bold(choice.name)
        }
      }

      // Prompt for command
      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: choices
      })

      // Handle selection
      switch (command) {

        case CommonCommands.back: {
          return
        }

        case AiTechDefs.amazonNova_V2Pro: {
          await this.setModels(
            prisma,
            AiTaskModelPresets.amazonNova2Based)

          return
        }

        case AiTechDefs.googleGemini_V3pt1ProFree: {
          await this.setModels(
            prisma,
            AiTaskModelPresets.gemini3pt1BasedFree)

          return
        }

        case AiTechDefs.googleGemini_V3pt1Pro: {
          await this.setModels(
            prisma,
            AiTaskModelPresets.gemini3pt1BasedPaid)

          return
        }

        case AiTechDefs.openAi_Gpt5pt2: {
          await this.setModels(
            prisma,
            AiTaskModelPresets.gpt5pt2Based)

          return
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
      AiTaskModelPresets.gemini3pt1BasedFree)
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
