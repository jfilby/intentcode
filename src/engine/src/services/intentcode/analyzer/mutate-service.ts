import { getModelId } from '@/services/intentcode/common/model-id.js'
import { IntentError } from '@/core/errors.js'
import type { ProjectStore } from '@/core/store.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { AnalyzerPromptTypes, IntentCodeAiTasks } from '@/types/server-only-types.js'
import { SourceNodeGenerationData } from '@/types/source-graph-types.js'
import { IntentCodeAnalysisGraphMutateService } from '@/services/graphs/intentcode-analysis/mutate-service.js'
import { IntentCodeAnalyzerLlmService } from './llm-service.js'
import { IntentCodeAnalyzerPromptService } from './prompt-service.js'
import { IntentCodeAnalyzerSuggestionsMutateService } from '../analyzer-suggestions/mutate-service.js'
import { ProjectCompileService } from '@/services/projects/compile-service.js'
import { ProjectsQueryService } from '@/services/projects/query-service.js'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service.js'

// Services
const intentCodeAnalysisGraphMutateService = new IntentCodeAnalysisGraphMutateService()
const intentCodeAnalyzerLlmService = new IntentCodeAnalyzerLlmService()
const intentCodeAnalyzerPromptService = new IntentCodeAnalyzerPromptService()
const intentCodeAnalyzerSuggestionsMutateService = new IntentCodeAnalyzerSuggestionsMutateService()
const projectCompileService = new ProjectCompileService()
const projectsQueryService = new ProjectsQueryService()
const specsGraphQueryService = new SpecsGraphQueryService()

// Class
export class IntentCodeAnalyzerMutateService {

  // Consts
  clName = 'IntentCodeAnalyzerMutateService'

  // Code
  getSuggestionsByPriority(suggestions: any) {

    // Generate a map of counts by priority
    const countByPriority = new Map<number, number>()

    for (const suggestion of suggestions) {

      countByPriority.set(
        suggestion.priority,
        (countByPriority.get(suggestion.priority) ?? 0) + 1)
    }

    // Create a string
    var str = ``

    const sortedPriorities = [...countByPriority.keys()].sort((a, b) => a - b)

    for (const priority of sortedPriorities) {
      if (str.length > 0) {
        str += `  `
      }

      const count = countByPriority.get(priority)!
      str += `p${priority}: ${count}`
    }

    // Return the counts string
    return str
  }

  async processQueryResults(
            store: ProjectStore,
            buildData: BuildData,
            buildFromFiles: BuildFromFile[],
            projectSpecsNode: SourceNodeRecord | null,
            sourceNodeGenerationData: SourceNodeGenerationData,
            jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Debug
    // console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

    // Write IntentCode files
    if (jsonContent != null &&
        jsonContent.suggestions.length > 0) {

      // Save the suggestions
      for (const suggestion of jsonContent.suggestions) {

        // Get ProjectDetail
        const projectDetail = buildData.projects[suggestion.projectNo]

        // Validate
        if (projectDetail == null) {
          throw new IntentError({
            category: 'StorageError',
            stage: fnName,
            message: `projectDetail == null`})
        }

        // Validate
        if (projectDetail.projectIntentCodeAnalysisNode == null) {
          throw new IntentError({
            category: 'StorageError',
            stage: fnName,
            message: `projectDetail.projectIntentCodeAnalysisNode == null`})
        }

        // Upsert suggestions
        await intentCodeAnalysisGraphMutateService.upsertSuggestion(
          store,
          projectDetail.projectIntentCodeAnalysisNode,
          suggestion)
      }

      // Output
      console.log(``)
      console.log(`Found ${jsonContent.suggestions.length} suggestions:`)

      // Get counts by priority
      const countByPriorityStr =
        this.getSuggestionsByPriority(jsonContent.suggestions)

      console.log(countByPriorityStr)

      // User to decide on how to handle the suggestions
      await intentCodeAnalyzerSuggestionsMutateService.userMenu(
        store,
        buildData,
        buildFromFiles,
        jsonContent.suggestions)
    }
  }

  async processWithLlm(
          store: ProjectStore,
          buildData: BuildData,
          buildFromFiles: BuildFromFile[],
          projectSpecsNode: SourceNodeRecord | null) {

    // Debug
    const fnName = `${this.clName}.processWithLlm()`

    // The model id
    const modelId = await getModelId(IntentCodeAiTasks.compiler)

    // Get prompt
    const prompt = await
      intentCodeAnalyzerPromptService.getPrompt(
        AnalyzerPromptTypes.createSuggestions,
        projectSpecsNode,
        buildData,
        buildFromFiles)

    /* Already generated?
    var jsonContent = await
          this.getExistingJsonContent(
            store,
            projectSpecsNode,
            modelId,
            prompt)

    // Run
    if (jsonContent == null) { */

      const llmResults = await
              intentCodeAnalyzerLlmService.llmRequest(
                store,
                buildData,
                                IntentCodeAiTasks.compiler,
                prompt)

      const jsonContent = llmResults.jsonContent
    // }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      modelId: modelId,
      prompt: prompt
    }

    // Process the results
    await this.processQueryResults(
            store,
            buildData,
            buildFromFiles,
            projectSpecsNode,
            sourceNodeGenerationData,
            jsonContent)
  }

  async run(store: ProjectStore,
            buildData: BuildData,
            projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.run()`

    // Console output
    console.log(`Running an analysis on the IntentCode..`)

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        projectNode.projectId,
        buildData.projects)

    // Get project specs node (might not exist)
    const projectSpecsNode = await
            specsGraphQueryService.getSpecsProjectNode(
              store,
              projectNode)

    // Get build file list
    const buildFromFiles = await
      projectCompileService.getBuildFromFiles(store, projectDetails)

    // Process spec files
    await this.processWithLlm(
            store,
            buildData,
            buildFromFiles,
            projectSpecsNode)
  }
}
