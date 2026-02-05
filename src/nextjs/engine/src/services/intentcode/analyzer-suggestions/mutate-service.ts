import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { ConsoleService } from '@/serene-core-server/services/console/service'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
import { AiTasksService } from '@/serene-ai-server/services/ai-tasks/ai-tasks-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { IntentCodeAnalyzerSuggestionsChatService } from './chat-service'
import { IntentCodeAnalyzerSuggestionsLlmService } from './llm-service'
import { IntentCodeAnalyzerSuggestionsPromptService } from './prompt-service'
import { IntentCodeUpdaterMutateService } from '../updater/mutate-service'

// Services
const aiTasksService = new AiTasksService()
const consoleService = new ConsoleService()
const intentCodeAnalyzerSuggestionsChatService = new IntentCodeAnalyzerSuggestionsChatService()
const intentCodeAnalyzerSuggestionsLlmService = new IntentCodeAnalyzerSuggestionsLlmService()
const intentCodeAnalyzerSuggestionsPromptService = new IntentCodeAnalyzerSuggestionsPromptService()
const intentCodeUpdaterMutateService = new IntentCodeUpdaterMutateService()
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
      aiTasksService.getTech(
        prisma,
        ServerOnlyTypes.namespace,
        IntentCodeAiTasks.compiler,
        null,  // userProfileId
        true)  // exceptionOnNotFound

    // Validate
    if (tech == null) {
      throw new CustomError(`${fnName}: tech == null`)
    }

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

    // console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

    // Process fileDelta
    await intentCodeUpdaterMutateService.processFileDeltas(
      prisma,
      buildData,
      jsonContent.intentCode)
  }

  async reviewSuggestion(
    prisma: PrismaClient,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestion: any) {

    // Print the suggestion
    console.log(``)
    console.log(
      chalk.bold(`─── This is a p${suggestion.priority} suggestion ───`))
    console.log(``)
    console.log(`Change: ${suggestion.text}`)

    console.log(``)
    console.log(`Files expected to be affected:`)

    for (const fileDelta of suggestion.fileDeltas) {

      console.log(`.. ${fileDelta.fileOp} ${fileDelta.relativePath}: ` +
        `${fileDelta.change}`)
    }

    // REPL loop
    while (true) {

      console.log(``)
      console.log(`[a] Add to approved list`)
      console.log(`[c] Chat about this suggestion`)
      console.log(`[p] Proceed with approved list`)
      console.log(`[i] Ignore this suggestion`)
      console.log(`[r] Ignore all, including approved list`)

      // Prompt for user selection
      const selection = await
              consoleService.askQuestion('> ')

      // Handle the user selection
      switch (selection.trim()) {

        case 'a': {
          return {
            addToApprovedList: true,
            stopReview: false,
            ignoreAll: false
          }
        }

        case  'c': {
          const results = await
            intentCodeAnalyzerSuggestionsChatService.openChat(
              prisma,
              buildData,
              buildFromFiles,
              suggestion)

          return {
            addToApprovedList: results.addToApprovedList,
            stopReview: false,
            ignoreAll: false
          }

          break
        }

        case 'x': {
          return {
            addToApprovedList: false,
            stopReview: false,
            ignoreAll: false,
            openChat: true
          }
        }

        case 'i': {
          return {
            addToApprovedList: false,
            stopReview: false,
            ignoreAll: false
          }
        }

        case 'p': {
          return {
            addToApprovedList: false,
            stopReview: true,
            ignoreAll: false
          }
        }

        case 'r': {
          return {
            addToApprovedList: false,
            stopReview: true,
            ignoreAll: true
          }
        }

        default: {
          console.log(``)
          console.log(`Invalid selection`)
        }
      }
    }
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

  async reviewSuggestionsOneByOne(
    prisma: PrismaClient,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestions: any[]) {

    // Debug
    const fnName = `${this.clName}.reviewSuggestionsOneByOne()`

    // Vars
    var approvedList: any[] = []

    // Iterate the suggestions
    for (const suggestion of suggestions) {

      // Review suggestion
      const { addToApprovedList, stopReview, ignoreAll } = await
        this.reviewSuggestion(
          prisma,
          buildData,
          buildFromFiles,
          suggestion)

      // Add to list?
      if (addToApprovedList === true) {
        approvedList.push(suggestion)
      }

      // Done?
      if (ignoreAll === true) {
        return
      }

      if (stopReview === true) {
        break
      }
    }

    // No changes to make?
    if (approvedList.length === 0) {
      return
    }

    // Make changes
    console.log(`${fnName}: making ${approvedList.length} changes..`)

    await this.approveSuggestions(
      prisma,
      buildData,
      buildFromFiles,
      approvedList)
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
      console.log(chalk.bold(`─── Options ───`))
      console.log(``)
      console.log(`[r] Review suggestions one-by-one`)
      // console.log(`[o] Review suggestions by overview`)
      console.log(`[a] Approve all suggestions`)
      console.log(`[i] Ignore all suggestions`)

      // Get selection
      const selection = await
        consoleService.askQuestion('> ')

      // Handle the selection
      switch (selection) {

        case 'r': {

          await this.reviewSuggestionsOneByOne(
            prisma,
            buildData,
            buildFromFiles,
            suggestions)

          return
        }

        /* case 'o': {

          await this.reviewSuggestionsByOverview(suggestions)
          return
        } */

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
