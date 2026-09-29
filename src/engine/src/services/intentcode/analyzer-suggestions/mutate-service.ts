import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import type { ProjectStore } from '@/core/store.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'
import { IntentCodeAnalyzerSuggestionsChatService } from './chat-service.js'
import { IntentCodeAnalyzerSuggestionsLlmService } from './llm-service.js'
import { IntentCodeAnalyzerSuggestionsPromptService } from './prompt-service.js'
import { IntentCodeUpdaterMutateService } from '../updater/mutate-service.js'

// Services
const intentCodeAnalyzerSuggestionsChatService = new IntentCodeAnalyzerSuggestionsChatService()
const intentCodeAnalyzerSuggestionsLlmService = new IntentCodeAnalyzerSuggestionsLlmService()
const intentCodeAnalyzerSuggestionsPromptService = new IntentCodeAnalyzerSuggestionsPromptService()
const intentCodeUpdaterMutateService = new IntentCodeUpdaterMutateService()

// Class
export class IntentCodeAnalyzerSuggestionsMutateService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsMutateService'

  addCommand = 'add'
  chatCommand = 'chat'
  proceedCommand = 'proceed'
  ignoreCommand = 'ignore'
  ignoreAllCommand = 'ignore-all'

  reviewCommand = 'review'
  approveAllCommand = 'approve-all'

  // Code
  async approveSuggestions(
    store: ProjectStore,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestions: any[]) {

    // Debug
    const fnName = `${this.clName}.approveSuggestions()`

    // Get the prompt
    const prompt = await
      intentCodeAnalyzerSuggestionsPromptService.getPrompt(
        buildData,
        buildFromFiles,
        suggestions)

    // LLM request
    const { status, message, jsonContent } = await
      intentCodeAnalyzerSuggestionsLlmService.llmRequest(
        store,
        buildData,
                IntentCodeAiTasks.compiler,
        prompt)

    // Process changes
    await this.processSuggestionChanges(
      store,
      buildData,
      jsonContent)
  }

  async processSuggestionChanges(
    store: ProjectStore,
    buildData: BuildData,
    jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processSuggestionChanges()`

    // console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

    // Process fileDelta
    await intentCodeUpdaterMutateService.processFileDeltas(
      store,
      buildData,
      jsonContent.intentCode)
  }

  async reviewSuggestion(
    store: ProjectStore,
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

      // Blank line
      console.log(``)

      // Prompt
      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Add to approved list`,
            value: this.addCommand
          },
          {
            name: `Chat about this suggestion`,
            value: this.chatCommand
          },
          {
            name: `Proceed with approved list`,
            value: this.proceedCommand
          },
          {
            name: `Ignore this suggestion`,
            value: this.ignoreCommand
          },
          {
            name: `Ignore all, including approved list`,
            value: this.ignoreAllCommand
          }
        ]
      })

      // Handle the user selection
      switch (command) {

        case this.addCommand: {
          return {
            addToApprovedList: true,
            stopReview: false,
            ignoreAll: false
          }
        }

        case this.chatCommand: {
          const results = await
            intentCodeAnalyzerSuggestionsChatService.openChat(
              store,
              buildData,
              buildFromFiles,
              suggestion)

          return {
            addToApprovedList: results.addToApprovedList,
            stopReview: false,
            ignoreAll: false
          }
        }

        case this.ignoreCommand: {
          return {
            addToApprovedList: false,
            stopReview: false,
            ignoreAll: false
          }
        }

        case this.ignoreAllCommand: {
          return {
            addToApprovedList: false,
            stopReview: true,
            ignoreAll: true
          }
        }

        case this.proceedCommand: {
          return {
            addToApprovedList: false,
            stopReview: true,
            ignoreAll: false
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
    store: ProjectStore,
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
          store,
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
      store,
      buildData,
      buildFromFiles,
      approvedList)
  }

  async userMenu(
    store: ProjectStore,
    buildData: BuildData,
    buildFromFiles: BuildFromFile[],
    suggestions: any[]) {

    // Loop until a valid selection is selected
    while (true) {

      // Output
      console.log(``)
      console.log(chalk.bold(`─── Options ───`))
      console.log(``)

      // Prompt for command
      const command = await select({
        message: `Select an option`,
        loop: false,
        pageSize: 10,
        choices: [
          {
            name: `Review suggestions one-by-one`,
            value: this.reviewCommand
          },
          {
            name: `Approve all suggestions`,
            value: this.approveAllCommand
          },
          {
            name: `Ignore all suggestions`,
            value: this.ignoreAllCommand
          }
        ]
      })

      // Handle the selection
      switch (command) {

        case this.reviewCommand: {

          await this.reviewSuggestionsOneByOne(
            store,
            buildData,
            buildFromFiles,
            suggestions)

          return
        }

        /* case 'o': {

          await this.reviewSuggestionsByOverview(suggestions)
          return
        } */

        case this.approveAllCommand: {

          await this.approveSuggestions(
            store,
            buildData,
            buildFromFiles,
            suggestions)

          return
        }

        case this.ignoreAllCommand: {

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
