import fs from 'fs'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
import { AiTasksService } from '@/serene-ai-server/services/ai-tasks/ai-tasks-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types'
import { SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { DotIntentCodeGraphQueryService } from '@/services/graphs/dot-intentcode/graph-query-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodeMessagesService } from '@/services/intentcode/common/messages-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'
import { ProjectsQueryService } from '@/services/projects/query-service'
import { TechStackLlmService } from './llm-service'
import { TechStackPromptService } from './prompt-service'
import { TechStackQueryService } from './query-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const aiTasksService = new AiTasksService()
const dependenciesMutateService = new DependenciesMutateService()
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()
const fsUtilsService = new FsUtilsService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const projectsQueryService = new ProjectsQueryService()
const techStackLlmService = new TechStackLlmService()
const techStackPromptService = new TechStackPromptService()
const techStackQueryService = new TechStackQueryService()
const usersService = new UsersService()

// Class
export class TechStackMutateService {

  // Consts
  clName = 'TechStackMutateService'

  // Code
  async getExistingJsonContent(
          prisma: PrismaClient,
          intentFileNode: SourceNode,
          tech: Tech,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Try to get existing indexer data SourceNode
    const indexerDataSourceNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              intentFileNode.id,  // parentId
              intentFileNode.instanceId,
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
              prisma,
              indexerDataSourceNode.id,
              tech.id,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return
    }

    // Return jsonContent
    return sourceNodeGeneration.jsonContent
  }

  async processTechStackFileWithLlm(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode,
          projectIntentCodeNode: SourceNode,
          projectDotIntentCodeNode: SourceNode,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

    // Verbose output
    console.log(`processing: ${buildFromFile.filename}..`)

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
      techStackPromptService.getPrompt(
        prisma,
        projectNode,
        buildData.extensionsData,
        buildFromFile)

    // Already generated?
    var jsonContent = await
          this.getExistingJsonContent(
            prisma,
            buildFromFile.fileNode,
            tech,
            prompt)

    // Run
    if (jsonContent == null) {

      // Debug
      // console.log(`${fnName}: LLM request..`)

      // LLM request
      const llmResults = await
              techStackLlmService.llmRequest(
                prisma,
                adminUserProfile.id,
                tech,
                prompt)

      jsonContent = llmResults.queryResultsJson
    }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      techId: tech.id,
      prompt: prompt
    }

    // Process the results
    await this.processQueryResults(
            prisma,
            projectNode,
            projectIntentCodeNode,
            projectDotIntentCodeNode,
            buildFromFile,
            sourceNodeGenerationData,
            jsonContent)
  }

  async processTechStack(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.processTechStack()`

    // Get ProjectDetails
    const projectDetails =
            projectsQueryService.getProjectDetailsByInstanceId(
              projectNode.instanceId,
              buildData.projects)

    // Get dotIntentCode node
    const projectDotIntentCodeNode = await
            dotIntentCodeGraphQueryService.getDotIntentCodeProject(
              prisma,
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
          prisma,
          projectDetails.projectIntentCodeNode,
          techStackFilename)

    // Check if the file has been updated since last indexed
    if (techStackNode?.contentUpdated != null &&
        techStackNode.contentUpdated <= fileModifiedTime) {

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
            prisma,
            buildData,
            projectNode,
            projectDetails.projectIntentCodeNode,
            projectDotIntentCodeNode,
            buildFromFile)
  }

  async processQueryResults(
          prisma: PrismaClient,
          projectNode: SourceNode,
          projectIntentCodeNode: SourceNode,
          projectDotIntentCodeNode: SourceNode,
          buildFromFile: BuildFromFile,
          sourceNodeGenerationData: SourceNodeGenerationData,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (projectIntentCodeNode == null) {
      throw new CustomError(`${fnName}: projectIntentCodeNode == null`)
    }

    if (buildFromFile.fileNode.jsonContent == null) {
      throw new CustomError(
        `${fnName}: intentFileNode.jsonContent == null`)
    }

    if ((buildFromFile.fileNode.jsonContent as any).relativePath == null) {
      throw new CustomError(
        `${fnName}: intentFileNode.jsonContent.relativePath == null`)
    }

    // Debug
    console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

    // Update DepsNode and write it to .intentcode/deps.json
    if (jsonContent.extensions != null ||
        jsonContent.source?.deps != null) {

      // Get/create deps node
      const depsNode = await
              dependenciesMutateService.getOrCreateDepsNode(
                prisma,
                projectNode)

      // Update depsNode
      if (depsNode.jsonContent.extensions == null) {
        depsNode.jsonContent.extensions = {}
      }

      for (const [key, value] of Object.entries(jsonContent.extensions)) {

        depsNode.jsonContent.extensions[key] = value
      }

      if (depsNode.jsonContent.source == null) {
        depsNode.jsonContent.source = {}
      }

      if (depsNode.jsonContent.source.deps == null) {
        depsNode.jsonContent.source.deps = {}
      }

      for (const [key, value] of Object.entries(jsonContent.source.deps)) {

        depsNode.jsonContent.source.deps[key] = value
      }

      // Update depsNode
      await dependenciesMutateService.updateDepsNode(
        prisma,
        projectNode,
        depsNode,
        true)  // writeToDepsJson
    }

    // Upsert the tech-stack.json node
    const techStackJsonSourceNode = await
      intentCodeGraphMutateService.upsertTechStackJson(
        prisma,
        projectIntentCodeNode.instanceId,
        projectIntentCodeNode,  // parentNode
        jsonContent,
        sourceNodeGenerationData,
        buildFromFile.fileModifiedTime)

    // Print warnings and errors
    intentCodeMessagesService.handleMessages(jsonContent)
  }
}
