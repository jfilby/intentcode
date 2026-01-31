import { PrismaClient } from '@prisma/client'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { LlmEnvNames } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { IntentCodeAnalyzerSuggestionsLlmService } from './llm-service'
import { IntentCodeAnalyzerSuggestionsPromptService } from './prompt-service'
import { IntentCodeUpdaterMutateService } from '../updater/mutate-service'

// Services
const consoleService = new ConsoleService()
const intentCodeAnalyzerSuggestionsLlmService = new IntentCodeAnalyzerSuggestionsLlmService()
const intentCodeAnalyzerSuggestionsPromptService = new IntentCodeAnalyzerSuggestionsPromptService()
const intentCodeUpdaterMutateService = new IntentCodeUpdaterMutateService()
const techQueryService = new TechQueryService()
const usersService = new UsersService()

// Class
export class IntentCodeAnalyzerSuggestionsMutateService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsMutateService'

  // Code
  async approveSuggestions(
    prisma: PrismaClient,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestions: any[]) {

    // Debug
    const fnName = `${this.clName}.approveSuggestions()`

    // Get the admin UserProfile
    const adminUserProfile = await
            usersService.getUserProfileByEmail(
              prisma,
              ServerTestTypes.adminUserEmail)

    if (adminUserProfile == null) {
      throw new CustomError(`${fnName}: adminUserProfile == null`)
    }

    // Get tech
    const tech = await
            techQueryService.getTechByEnvKey(
              prisma,
              LlmEnvNames.specsTranslatorEnvName)

    // Get the prompt
    const prompt = await
      intentCodeAnalyzerSuggestionsPromptService.getPrompt(
        prisma,
        buildData,
        buildFromFiles,
        suggestions)

    // LLM request
    const { status, message, jsonContent } = await
      intentCodeAnalyzerSuggestionsLlmService.llmRequest(
        prisma,
        buildData,
        adminUserProfile.id,
        tech,
        prompt)

    // Process changes
    await this.processSuggestionChanges(
      prisma,
      buildData,
      jsonContent)
  }

  async processSuggestionChanges(
    prisma: PrismaClient,
    buildData: BuildData,
    jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processSuggestionChanges()`

    // Process fileDelta
    await intentCodeUpdaterMutateService.processFileDeltas(
      prisma,
      buildData,
      jsonContent.intentCode)
  }

  async reviewSuggestionsByOverview(suggestions: any[]) {

    // Iterate the suggestions
    for (const suggestion of suggestions) {

      // Print the suggestion
      ;

      // Print user options
      ;

      // Get user selection
      ;

      // Approve/next handling based on selection
      ;
    }
  }

  async reviewSuggestionsOneByOne(suggestions: any[]) {

    // Iterate the suggestions
    for (const suggestion of suggestions) {

      // Print the suggestion
      ;

      // Print user options
      ;

      // Get user selection
      ;

      // Approve/next handling based on selection
      ;
    }
  }

  async reviewSuggestion(suggestion: any) {

    ;
  }

  async userMenu(
    prisma: PrismaClient,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestions: any[]) {

    // Loop until a valid selection is selected
    while (true) {

      // Output
      console.log(``)
      console.log(`Options:`)
      console.log(`[r] Review suggestions one-by-one`)
      console.log(`[o] Review suggestions by overview`)
      console.log(`[a] Approve all suggestions`)
      console.log(`[i] Ignore all suggestions`)

      // Get selection
      const selection = await
        consoleService.askQuestion('> ')

      // Handle the selection
      switch (selection) {

        case 'r': {

          await this.reviewSuggestionsOneByOne(suggestions)
          return
        }

        case 'o': {

          await this.reviewSuggestionsByOverview(suggestions)
          return
        }

        case 'a': {

          await this.approveSuggestions(
            prisma,
            buildData,
            buildFromFiles,
            suggestions)

          return
        }

        case 'i': {

          // Ignore (for now)
          return
        }

        default: {
          console.log(`Invalid selection`)
        }
      }
    }
  }
}
