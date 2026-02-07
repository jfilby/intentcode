import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { SpecsTechStackLlmService } from './llm-service'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { AiTasksService } from '@/serene-ai-server/services/ai-tasks/ai-tasks-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types'
import { SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { DotIntentCodeGraphQueryService } from '@/services/graphs/dot-intentcode/graph-query-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeMessagesService } from '@/services/intentcode/common/messages-service'
import { SpecsGraphMutateService } from '@/services/graphs/specs/graph-mutate-service'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service'
import { SpecsPathGraphMutateService } from '@/services/graphs/specs/path-graph-mutate-service'
import { SpecsTechStackPromptService } from './prompt-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const aiTasksService = new AiTasksService()
const dependenciesMutateService = new DependenciesMutateService()
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()
const fsUtilsService = new FsUtilsService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const specsGraphMutateService = new SpecsGraphMutateService()
const specsGraphQueryService = new SpecsGraphQueryService()
const specsPathGraphMutateService = new SpecsPathGraphMutateService()
const specsTechStackLlmService = new SpecsTechStackLlmService()
const specsTechStackPromptService = new SpecsTechStackPromptService()
const walkDirService = new WalkDirService()
const usersService = new UsersService()

// Class
export class SpecsTechStackMutateService {

  // Consts
  clName = 'SpecsTechStackMutateService'

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
          projectSpecsNode: SourceNode,
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
      specsTechStackPromptService.getPrompt(
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
              specsTechStackLlmService.llmRequest(
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
            projectSpecsNode,
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

    // Get project specs node
    const projectSpecsNode = await
            specsGraphQueryService.getSpecsProjectNode(
              prisma,
              projectNode)

    // Validate
    if (projectSpecsNode == null) {
      return
    }

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

    // Debug
    // console.log(`${fnName}: path: ` +
    //             JSON.stringify((projectSpecsNode.jsonContent as any).path))

    // Get specsPath
    const specsPath = (projectSpecsNode.jsonContent as any).path

    // Walk dir
    var mdFilesList: string[] = []

    await walkDirService.walkDir(
            specsPath,
            mdFilesList,
            {
              recursive: true,
              fileExts: ['.md']
            })

    // Debug
    // console.log(`${fnName}: mdFilesList: ` + JSON.stringify(mdFilesList))

    // Find the tech-stack.md file
    var techStackList: string[] = []

    for (const mdFilename of mdFilesList) {

      // Verify that this is tech-stack.md
      if (path.basename(mdFilename) === ServerOnlyTypes.techStackFilename) {
        techStackList.push(mdFilename)
      }
    }

    // Debug
    // console.log(`${fnName}: techStackList: ` + JSON.stringify(techStackList))

    // Verify exactly one instance of the tech-stack.md file
    if (techStackList.length === 0) {
      console.log(`No tech-stack.md file`)
      return

    } else if (techStackList.length > 1) {
      console.log(`More than one tech-stack.md file found`)
      process.exit(1)
    }

    // Get tech-stack.md full path
    const techStackFilename = techStackList[0]

    const techStackRelativePath =
      techStackFilename.substring(specsPath.length + 1)

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
      specsPathGraphMutateService.getOrCreateSpecsPathAsGraph(
        prisma,
        projectSpecsNode,
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
            projectSpecsNode,
            projectDotIntentCodeNode,
            buildFromFile)
  }

  async processQueryResults(
          prisma: PrismaClient,
          projectNode: SourceNode,
          projectSpecsNode: SourceNode,
          projectDotIntentCodeNode: SourceNode,
          buildFromFile: BuildFromFile,
          sourceNodeGenerationData: SourceNodeGenerationData,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (projectSpecsNode == null) {
      throw new CustomError(`${fnName}: projectSpecsNode == null`)
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
            specsGraphMutateService.upsertTechStackJson(
              prisma,
              projectSpecsNode.instanceId,
              projectSpecsNode,  // parentNode
              jsonContent,
              sourceNodeGenerationData,
              buildFromFile.fileModifiedTime)

    // Print warnings and errors
    intentCodeMessagesService.handleMessages(jsonContent)
  }
}
