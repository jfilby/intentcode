import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { AiTasksService } from '@/serene-ai-server/services/ai-tasks/ai-tasks-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeAiTasks, ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { SourceNodeGenerationData } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeMessagesService } from '@/services/intentcode/common/messages-service'
import { IntentCodeUpdaterMutateService } from '@/services/intentcode/updater/mutate-service'
import { SpecsGraphMutateService } from '@/services/graphs/specs/graph-mutate-service'
import { ProjectsQueryService } from '@/services/projects/query-service'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service'
import { SpecsLlmService } from './llm-service'
import { SpecsPathGraphMutateService } from '@/services/graphs/specs/path-graph-mutate-service'
import { SpecsToIntentCodePromptService } from './prompt-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()

// Services
const aiTasksService = new AiTasksService()
const fsUtilsService = new FsUtilsService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodeUpdaterMutateService = new IntentCodeUpdaterMutateService()
const projectsQueryService = new ProjectsQueryService()
const specsGraphMutateService = new SpecsGraphMutateService()
const specsGraphQueryService = new SpecsGraphQueryService()
const specsLlmService = new SpecsLlmService()
const specsPathGraphMutateService = new SpecsPathGraphMutateService()
const specsToIntentCodePromptService = new SpecsToIntentCodePromptService()
const usersService = new UsersService()
const walkDirService = new WalkDirService()

// Class
export class SpecsToIntentCodeMutateService {

  // Consts
  clName = 'SpecsToIntentCodeMutateService'

  // Code
  async getExistingJsonContent(
          prisma: PrismaClient,
          projectSpecsNode: SourceNode,
          tech: Tech,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Get promptHash
    const promptHash = blake3(JSON.stringify(prompt)).toString()

    // Try to get existing SourceNodeGeneration
    const sourceNodeGeneration = await
            sourceNodeGenerationModel.getByUniqueKey(
              prisma,
              projectSpecsNode.id,
              tech.id,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return
    }

    // Return jsonContent
    return sourceNodeGeneration.jsonContent
  }

  async processQueryResults(
            prisma: PrismaClient,
            buildData: BuildData,
            projectSpecsNode: SourceNode,
            sourceNodeGenerationData: SourceNodeGenerationData,
            jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Debug
    console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

    // Write IntentCode files
    if (jsonContent.intentCode != null) {

      // Process fileDelta
      await intentCodeUpdaterMutateService.processFileDeltas(
        prisma,
        buildData,
        jsonContent.intentCode)
    }

    // Upsert the specs project node
    projectSpecsNode = await
      specsGraphMutateService.upsertTechStackJson(
        prisma,
        projectSpecsNode.instanceId,
        projectSpecsNode,  // parentNode
        jsonContent,
        sourceNodeGenerationData,
        new Date())        // fileModifiedTime

    // Print warnings and errors
    intentCodeMessagesService.handleMessages(jsonContent)
  }

  async processSpecFilesWithLlm(
          prisma: PrismaClient,
          buildData: BuildData,
          projectSpecsNode: SourceNode,
          buildFromFiles: BuildFromFile[]) {

    // Debug
    const fnName = `${this.clName}.processSpecFilesWithLlm()`

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
      specsToIntentCodePromptService.getPrompt(
        prisma,
        projectSpecsNode,
        buildData,
        buildFromFiles)

    // Already generated?
    var jsonContent = await
          this.getExistingJsonContent(
            prisma,
            projectSpecsNode,
            tech,
            prompt)

    // Run
    if (jsonContent == null) {

      const llmResults = await
              specsLlmService.llmRequest(
                prisma,
                buildData,
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
            buildData,
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
    console.log(`Compiling specs to IntentCode..`)

    // Get ProjectDetails
    const projectDetails =
            projectsQueryService.getProjectDetailsByInstanceId(
              projectNode.instanceId,
              buildData.projectsMap)

    // Get project specs node
    const projectSpecsNode = await
            specsGraphQueryService.getSpecsProjectNode(
              prisma,
              projectNode)

    // Validate
    if (projectSpecsNode == null) {
      return
    }

    // Get specs path
    const specsPath = (projectSpecsNode.jsonContent as any).path

    // Debug
    // console.log(`${fnName}: specsPath: ${specsPath}`)

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
          prisma,
          projectSpecsNode,
          mdFilename)

      // Check if the file has been updated since last indexed
      if (specFileNode?.contentUpdated != null &&
          specFileNode.contentUpdated <= fileModifiedTime) {

        console.log(`${fnName}: file: ${mdFilename} already processed`)
        return
      }

      // Determine targetFullPath
      var targetFullPath: string | undefined = undefined

      if (isTechStackMd === false) {

        // Determine relative path
        const relativePath = mdFilename.slice(specsPath.length)

        // Determine target full path
        targetFullPath =
          `${(projectDetails.projectIntentCodeNode.jsonContent as any).path}` +
          `${path.sep}${relativePath}`
      }

      // Debug
      // console.log(`${fnName}: ${mdFilename}: ${content}`)

      // Add to buildFromFiles
      buildFromFiles.push({
        filename: mdFilename,
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
            prisma,
            buildData,
            projectSpecsNode,
            buildFromFiles)
  }
}
