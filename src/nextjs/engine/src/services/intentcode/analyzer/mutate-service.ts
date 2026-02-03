import fs from 'fs'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
import { AiTasksService } from '@/serene-ai-server/services/ai-tasks/ai-tasks-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { SourceNodeGenerationData } from '@/types/source-graph-types'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeAnalysisGraphMutateService } from '@/services/graphs/intentcode-analysis/mutate-service'
import { IntentCodeAnalyzerLlmService } from './llm-service'
import { IntentCodeAnalyzerPromptService } from './prompt-service'
import { IntentCodeAnalyzerSuggestionsMutateService } from '../analyzer-suggestions/mutate-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'
import { ProjectCompileService } from '@/services/projects/compile-service'
import { ProjectsQueryService } from '@/services/projects/query-service'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service'

// Services
const aiTasksService = new AiTasksService()
const fsUtilsService = new FsUtilsService()
const intentCodeAnalysisGraphMutateService = new IntentCodeAnalysisGraphMutateService()
const intentCodeAnalyzerLlmService = new IntentCodeAnalyzerLlmService()
const intentCodeAnalyzerPromptService = new IntentCodeAnalyzerPromptService()
const intentCodeAnalyzerSuggestionsMutateService = new IntentCodeAnalyzerSuggestionsMutateService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const projectCompileService = new ProjectCompileService()
const projectsQueryService = new ProjectsQueryService()
const specsGraphQueryService = new SpecsGraphQueryService()
const usersService = new UsersService()

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
            prisma: PrismaClient,
            buildData: BuildData,
            buildFromFiles: BuildFromFile[],
            projectSpecsNode: SourceNode,
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
        const projectDetail = buildData.projectsMap.get(suggestion.projectNo)

        // Validate
        if (projectDetail == null) {
          throw new CustomError(`${fnName}: projectDetail == null`)
        }

        // Upsert suggestions
        await intentCodeAnalysisGraphMutateService.upsertSuggestion(
          prisma,
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
        prisma,
        buildData,
        buildFromFiles,
        jsonContent.suggestions)
    }
  }

  async processDiscoveryWithLlm(
          prisma: PrismaClient,
          buildData: BuildData,
          buildFromFiles: BuildFromFile[],
          projectSpecsNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.processDiscoveryWithLlm()`

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

    // Get prompt
    const prompt = await
      intentCodeAnalyzerPromptService.getPrompt(
        prisma,
        projectSpecsNode,
        buildData,
        buildFromFiles)

    /* Already generated?
    var jsonContent = await
          this.getExistingJsonContent(
            prisma,
            projectSpecsNode,
            tech,
            prompt)

    // Run
    if (jsonContent == null) { */

      const llmResults = await
              intentCodeAnalyzerLlmService.llmRequest(
                prisma,
                buildData,
                adminUserProfile.id,
                tech,
                prompt)

      const jsonContent = llmResults.jsonContent
    // }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      techId: tech.id,
      prompt: prompt
    }

    // Process the results
    await this.processQueryResults(
            prisma,
            buildData,
            buildFromFiles,
            projectSpecsNode,
            sourceNodeGenerationData,
            jsonContent)
  }

  async run(prisma: PrismaClient,
            buildData: BuildData,
            projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.run()`

    // Console output
    console.log(`Running discovery for IntentCode..`)

    // Get ProjectDetails
    const projectDetails =
            projectsQueryService.getProjectDetailsByInstanceId(
              projectNode.instanceId,
              buildData.projectsMap)

    // Get project specs node (might not exist)
    const projectSpecsNode = await
            specsGraphQueryService.getSpecsProjectNode(
              prisma,
              projectNode)

    // Get build file list
    const buildFileList = await
      projectCompileService.getBuildFileList(projectDetails)

    // Get IntentCode files as BuildFromFile[]
    var buildFromFiles: BuildFromFile[] = []
    for (const buildFile of buildFileList) {

      // Get last save time of the file
      const fileModifiedTime = await
              fsUtilsService.getLastUpdateTime(buildFile.intentCodeFilename)

      // Read file
      const intentCode = await
              fs.readFileSync(
                buildFile.intentCodeFilename,
                { encoding: 'utf8', flag: 'r' })

      // Get/create the file's SourceNode
      const intentFileNode = await
        intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
          prisma,
          projectDetails.projectIntentCodeNode,
          buildFile.intentCodeFilename)

      // Define BuildFromFile
      const buildFromFile: BuildFromFile = {
        filename: buildFile.intentCodeFilename,
        fileModifiedTime: fileModifiedTime,
        content: intentCode,
        fileNode: intentFileNode,
        targetFileExt: buildFile.targetFileExt
      }

      // Add to buildFromFiles
      buildFromFiles.push(buildFromFile)
    }

    // Process spec files
    await this.processDiscoveryWithLlm(
            prisma,
            buildData,
            buildFromFiles,
            projectSpecsNode)
  }
}
