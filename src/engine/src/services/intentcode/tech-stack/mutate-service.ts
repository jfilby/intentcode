import { getModelId } from '@/services/intentcode/common/model-id.js'
import { IntentError } from '@/core/errors.js'
import fs from 'fs'
import { blake3 } from '@noble/hashes/blake3'
import { ProjectStore } from '@/core/store.js'
import { SourceNodeRecord } from '@/core/records.js'
import type { NodeContent } from '@/core/records.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'
import { SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service.js'
import { DotIntentCodeGraphQueryService } from '@/services/graphs/dot-intentcode/graph-query-service.js'
import { FsUtilsService } from '@/services/utils/fs-utils-service.js'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service.js'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service.js'
import { IntentCodeMessagesService } from '@/services/intentcode/common/messages-service.js'
import { ProjectsQueryService } from '@/services/projects/query-service.js'
import { TechStackLlmService } from './llm-service.js'
import { TechStackPromptService } from './prompt-service.js'
import { TechStackQueryService } from './query-service.js'

/** Whether a JSON value is an object whose keys can be written to. */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' &&
    Array.isArray(value) === false
}

/**
 * The extensions and deps the model reported, merged into what the project's
 * deps node already records. A key the model did not mention is left alone,
 * which is why this merges rather than replaces.
 */
function mergeIntoDepsJson(
  existing: NodeContent | null,
  reported: any): NodeContent {

  const depsJson: NodeContent = existing ?? {}

  const extensions =
    isJsonObject(depsJson.extensions) ? depsJson.extensions : {}

  for (const [key, value] of Object.entries(reported.extensions ?? {})) {
    extensions[key] = value
  }
  depsJson.extensions = extensions

  const source = isJsonObject(depsJson.source) ? depsJson.source : {}
  const deps = isJsonObject(source.deps) ? source.deps : {}

  for (const [key, value] of
       Object.entries(reported.source?.deps ?? {})) {
    deps[key] = value
  }
  source.deps = deps
  depsJson.source = source

  return depsJson
}

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()
const fsUtilsService = new FsUtilsService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const projectsQueryService = new ProjectsQueryService()
const techStackLlmService = new TechStackLlmService()
const techStackPromptService = new TechStackPromptService()
const techStackQueryService = new TechStackQueryService()

// Class
export class TechStackMutateService {

  // Consts
  clName = 'TechStackMutateService'

  // Code
  async getExistingJsonContent(
          store: ProjectStore,
          intentFileNode: SourceNodeRecord,
          modelId: string,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Try to get existing indexer data SourceNode
    const indexerDataSourceNode = await
            sourceNodeModel.getByUniqueKey(
              store,
              intentFileNode.id,  // parentId
              intentFileNode.projectId,
              SourceNodeTypes.intentCodeIndexedData,
              SourceNodeNames.indexedData)

    if (indexerDataSourceNode == null) {
      return null
    }

    // Get promptHash
    const promptHash = blake3(JSON.stringify(prompt)).toString()

    // Try to get existing SourceNodeGeneration
    const sourceNodeGeneration = await
            sourceNodeGenerationModel.getByUniqueKey(
              store,
              indexerDataSourceNode.id,
              modelId,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return
    }

    // Return jsonContent
    return sourceNodeGeneration.jsonContent
  }

  async processTechStackFileWithLlm(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord,
          projectIntentCodeNode: SourceNodeRecord,
          projectDotIntentCodeNode: SourceNodeRecord,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

    // Verbose output
    console.log(`processing: ${buildFromFile.filename}..`)

    // The model id
    const modelId = await getModelId(IntentCodeAiTasks.compiler)

    // Get prompt
    const prompt = await
      techStackPromptService.getPrompt(
        buildData.extensionsData,
        buildFromFile)

    // Already generated? The value is whatever the model replied with, so it
    // stays untyped until processQueryResults reads it.
    var jsonContent: unknown = await
          this.getExistingJsonContent(
            store,
            buildFromFile.fileNode,
            modelId,
            prompt)

    // Run
    if (jsonContent == null) {

      // Debug
      // console.log(`${fnName}: LLM request..`)

      // LLM request
      const llmResults = await
              techStackLlmService.llmRequest(
                store,
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
            projectNode,
            projectIntentCodeNode,
            projectDotIntentCodeNode,
            buildFromFile,
            sourceNodeGenerationData,
            jsonContent)
  }

  async processTechStack(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.processTechStack()`

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        projectNode.projectId,
        buildData.projects)

    // Get dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphQueryService.getDotIntentCodeProject(
              store,
              projectNode)

    // Validate
    if (projectDotIntentCodeNode == null) {
      console.error(`Missing .intentcode project node`)
      process.exit(1)
    }

    // Get tech-stack.md
    const { intentCodePath, techStackFilename } = await
      techStackQueryService.getFilename(projectDetails)

    // Skip if not found
    if (techStackFilename == null) {

      console.error(`The tech-stack.md file was expected but not found`)
      process.exit(1)
    }

    // Get relative path
    const techStackRelativePath =
      techStackFilename.substring(intentCodePath.length + 1)

    // Get last save time of the file
    const fileModifiedTime = await
            fsUtilsService.getLastUpdateTime(techStackFilename)

    // Read file
    const techStack = await
            fs.readFileSync(
              techStackFilename,
              { encoding: 'utf8', flag: 'r' })

      // Get/create the file's SourceNode
      const techStackNode = await
        intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
          store,
          projectDetails.projectIntentCodeNode,
          techStackFilename)

    // Check if the file has been updated since last indexed
    if (techStackNode?.contentUpdated != null &&
        new Date(techStackNode.contentUpdated) <= fileModifiedTime) {

      // console.log(`${fnName}: file: ${intentCodeFilename} already indexed`)
      return
    }

    // Build file
    const buildFromFile: BuildFromFile = {
      filename: techStackFilename,
      relativePath: techStackRelativePath,
      content: techStack,
      fileModifiedTime: fileModifiedTime,
      fileNode: techStackNode,
      targetFileExt: '.json'
    }

    // Process tech-stack.md
    await this.processTechStackFileWithLlm(
            store,
            buildData,
            projectNode,
            projectDetails.projectIntentCodeNode,
            projectDotIntentCodeNode,
            buildFromFile)
  }

  async processQueryResults(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          projectIntentCodeNode: SourceNodeRecord,
          projectDotIntentCodeNode: SourceNodeRecord,
          buildFromFile: BuildFromFile,
          sourceNodeGenerationData: SourceNodeGenerationData,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (projectIntentCodeNode == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: projectIntentCodeNode == null`
      })
    }

    const fileJsonContent = buildFromFile.fileNode.jsonContent
    if (fileJsonContent == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: intentFileNode.jsonContent == null`
      })
    }

    if (typeof fileJsonContent !== 'object' ||
        !('relativePath' in fileJsonContent) ||
        fileJsonContent.relativePath == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: intentFileNode.jsonContent.relativePath == null`
      })
    }

    // Debug
    console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

    // Update DepsNode and write it to .intentcode/deps.json
    if (jsonContent.extensions != null ||
        jsonContent.source?.deps != null) {

      // Get/create deps node
      const depsNode = await
              dependenciesMutateService.getOrCreateDepsNode(
                store,
                projectNode)

      // Update depsNode. Its jsonContent is the persisted record, so it is
      // merged in place rather than replaced: a deps key the model did not
      // mention has to survive.
      depsNode.jsonContent = mergeIntoDepsJson(
        depsNode.jsonContent,
        jsonContent)

      // Update depsNode
      await dependenciesMutateService.updateDepsNode(
        store,
        projectNode,
        depsNode,
        true)  // writeToDepsJson
    }

    // Upsert the tech-stack.json node
    const techStackJsonSourceNode = await
      intentCodeGraphMutateService.upsertTechStackJson(
        store,
        projectIntentCodeNode.projectId,
        projectIntentCodeNode,  // parentNode
        jsonContent,
        sourceNodeGenerationData,
        buildFromFile.fileModifiedTime)

    // Print warnings and errors
    intentCodeMessagesService.handleMessages(jsonContent)
  }
}
