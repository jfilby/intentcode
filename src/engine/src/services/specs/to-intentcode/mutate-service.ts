import { getModelId } from '@/services/intentcode/common/model-id.js'
import fs from 'fs'
import path from 'path'
import { IntentError } from '@/core/errors.js'
import { walkDir, type WalkDirConfig } from '@/core/walk-dir.js'
import { blake3 } from '@noble/hashes/blake3'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import type { ProjectStore } from '@/core/store.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { IntentCodeAiTasks, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { SourceNodeGenerationData } from '@/types/source-graph-types.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { FsUtilsService } from '@/services/utils/fs-utils-service.js'
import { IntentCodeMessagesService } from '@/services/intentcode/common/messages-service.js'
import { IntentCodeUpdaterMutateService } from '@/services/intentcode/updater/mutate-service.js'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service.js'
import { SpecsLlmService } from './llm-service.js'
import { SpecsPathGraphMutateService } from '@/services/graphs/specs/path-graph-mutate-service.js'
import { SpecsToIntentCodePromptService } from './prompt-service.js'
import { ProjectsQueryService } from '@/services/projects/query-service.js'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()

// Services
const fsUtilsService = new FsUtilsService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodeUpdaterMutateService = new IntentCodeUpdaterMutateService()
const specsGraphQueryService = new SpecsGraphQueryService()
const specsLlmService = new SpecsLlmService()
const projectsQueryService = new ProjectsQueryService()
const specsPathGraphMutateService = new SpecsPathGraphMutateService()
const specsToIntentCodePromptService = new SpecsToIntentCodePromptService()

// Class
export class SpecsToIntentCodeMutateService {

  // Consts
  clName = 'SpecsToIntentCodeMutateService'

  // Code
  async getExistingJsonContent(
          store: ProjectStore,
          projectSpecsNode: SourceNodeRecord,
          modelId: string,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Get promptHash
    const promptHash = blake3(JSON.stringify(prompt)).toString()

    // Try to get existing SourceNodeGeneration
    const sourceNodeGeneration = await
            sourceNodeGenerationModel.getByUniqueKey(
              store,
              projectSpecsNode.id,
              modelId,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return
    }

    // Return jsonContent
    return sourceNodeGeneration.jsonContent
  }

  async processQueryResults(
            store: ProjectStore,
            buildData: BuildData,
            projectSpecsNode: SourceNodeRecord,
            sourceNodeGenerationData: SourceNodeGenerationData,
            jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))
    }

    // Write IntentCode files
    if (jsonContent.intentCode != null) {

      // Process fileDelta
      await intentCodeUpdaterMutateService.processFileDeltas(
        store,
        buildData,
        jsonContent.intentCode)
    }

    // Print warnings and errors
    intentCodeMessagesService.handleMessages(jsonContent)
  }

  async processSpecFilesWithLlm(
          store: ProjectStore,
          buildData: BuildData,
          projectSpecsNode: SourceNodeRecord,
          buildFromFiles: BuildFromFile[]) {

    // Debug
    const fnName = `${this.clName}.processSpecFilesWithLlm()`

    // The model id
    const modelId = await getModelId(IntentCodeAiTasks.compiler)

    // Get prompt
    const prompt = await
      specsToIntentCodePromptService.getPrompt(
        store,
        projectSpecsNode,
        buildData,
        buildFromFiles)

    // Already generated? The value is whatever the model replied with, so it
    // stays untyped until processQueryResults reads it.
    var jsonContent: unknown = await
          this.getExistingJsonContent(
            store,
            projectSpecsNode,
            modelId,
            prompt)

    // Run
    if (jsonContent == null) {

      const llmResults = await
              specsLlmService.llmRequest(
                store,
                buildData,
                                IntentCodeAiTasks.compiler,
                prompt)

      jsonContent = llmResults.queryResultsJson
    }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      modelId: modelId,
      prompt: prompt
    }

    // Process the results
    await this.processQueryResults(
            store,
            buildData,
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
    console.log(`Compiling specs to IntentCode..`)

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        projectNode.projectId,
        buildData.projects)

    // Get project intentcode node path
    const projectIntentCodeJsonContent = projectDetails.projectIntentCodeNode.jsonContent
    const projectIntentCodePath =
      projectIntentCodeJsonContent != null &&
      typeof projectIntentCodeJsonContent === 'object' &&
      'path' in projectIntentCodeJsonContent &&
      typeof projectIntentCodeJsonContent.path === 'string'
        ? projectIntentCodeJsonContent.path
        : undefined

    // Get project specs node
    const projectSpecsNode = await
            specsGraphQueryService.getSpecsProjectNode(
              store,
              projectNode)

    // Validate
    if (projectSpecsNode == null) {
      return
    }

    // Get specs path
    const specsJsonContent = projectSpecsNode.jsonContent
    const specsPath =
      specsJsonContent != null && typeof specsJsonContent === 'object' &&
      'path' in specsJsonContent && typeof specsJsonContent.path === 'string'
        ? specsJsonContent.path
        : undefined

    // Validate
    if (specsPath == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: specsPath == null`
      })
    }

    // Debug
    // console.log(`${fnName}: specsPath: ${specsPath}`)

    // Walk dir
    var mdFilesList: string[] = []

    await walkDir(
            specsPath,
            mdFilesList,
            {
              recursive: true,
              fileExts: ['.md']
            })

    // Debug
    // console.log(`${fnName}: mdFilesList: ` + JSON.stringify(mdFilesList))

    // Compile build files
    const buildFromFiles: BuildFromFile[] = []
    var specsFilesExcludingTechStack = 0

    for (const mdFilename of mdFilesList) {

      // Count specs files (exluding tech-stack.md)
      var isTechStackMd = false

      if (path.basename(mdFilename) !== ServerOnlyTypes.techStackFilename) {
        isTechStackMd = true
        specsFilesExcludingTechStack += 1
      }

      // Get last save time of the file
      const fileModifiedTime = await
              fsUtilsService.getLastUpdateTime(mdFilename)

      // Read file
      const content = await
              fs.readFileSync(
                mdFilename,
                { encoding: 'utf8', flag: 'r' })

      // Get/create the file's SourceNode
      const specFileNode = await
        specsPathGraphMutateService.getOrCreateSpecsPathAsGraph(
          store,
          projectSpecsNode,
          mdFilename)

      // Check if the file has been updated since last indexed
      if (specFileNode?.contentUpdated != null &&
          new Date(specFileNode.contentUpdated) <= fileModifiedTime) {

        console.log(`${fnName}: file: ${mdFilename} already processed`)
        return
      }

      // Determine relative path
      const relativePath = mdFilename.slice(specsPath.length + 1)

      // Determine targetFullPath
      var targetFullPath: string | undefined = undefined

      if (isTechStackMd === false) {

        // Determine target full path
        targetFullPath =
          `${projectIntentCodePath}` +
          `${path.sep}${relativePath}`
      }

      // Debug
      // console.log(`${fnName}: ${mdFilename}: ${content}`)

      // Add to buildFromFiles
      buildFromFiles.push({
        filename: mdFilename,
        relativePath: relativePath,
        content: content,
        fileModifiedTime: fileModifiedTime,
        fileNode: specFileNode,
        targetFileExt: '.md',
        targetFullPath: targetFullPath
      })
    }

    // Don't proceed if no specs to process (doesn't include tech-stack.md)
    if (specsFilesExcludingTechStack === 0) {
      console.log(`No spec files (not including tech-stack.md)`)
      return
    }

    // Process spec files
    await this.processSpecFilesWithLlm(
            store,
            buildData,
            projectSpecsNode,
            buildFromFiles)
  }
}
