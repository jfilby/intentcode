import fs from 'fs'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { TextParsingService } from '@/serene-ai-server/services/content/text-parsing-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { LlmEnvNames, ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { SourceNodeNames, SourceNodeGenerationData, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { CompilerMutateLlmService } from './llm-service'
import { CompilerPromptService } from './prompt-service'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodeGraphQueryService } from '@/services/graphs/intentcode/graph-query-service'
import { IntentCodeMessagesService } from '../../common/messages-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'
import { SourceAssistIntentCodeService } from '../../source/source-prompt'
import { SourceCodePathGraphMutateService } from '@/services/graphs/source-code/path-graph-mutate-service'
import { SourceCodePathGraphQueryService } from '@/services/graphs/source-code/path-graph-query-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const compilerMutateLlmService = new CompilerMutateLlmService()
const compilerPromptService = new CompilerPromptService()
const dependenciesMutateService = new DependenciesMutateService()
const fsUtilsService = new FsUtilsService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeGraphQueryService = new IntentCodeGraphQueryService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const sourceAssistIntentCodeService = new SourceAssistIntentCodeService()
const sourceCodePathGraphMutateService = new SourceCodePathGraphMutateService()
const sourceCodePathGraphQueryService = new SourceCodePathGraphQueryService()
const techQueryService = new TechQueryService()
const textParsingService = new TextParsingService()
const usersService = new UsersService()

// Class
export class CompilerMutateService {

  // Consts
  clName = 'CompilerMutateService'

  // Code
  async getExistingJsonContent(
          prisma: PrismaClient,
          intentFileNode: SourceNode,
          tech: Tech,
          prompt: string) {

    // Debug
    const fnName = `${this.clName}.getExistingJsonContent()`

    // Try to get existing compiler data SourceNode
    const compilerDataSourceNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              intentFileNode.id,  // parentId
              intentFileNode.instanceId,
              SourceNodeTypes.intentCodeCompilerData,
              SourceNodeNames.compilerData)

    if (compilerDataSourceNode == null) {
      return {
        content: undefined,
        jsonContent: undefined
      }
    }

    // Get promptHash
    const promptHash = blake3(JSON.stringify(prompt)).toString()

    // Try to get existing SourceNodeGeneration
    const sourceNodeGeneration = await
            sourceNodeGenerationModel.getByUniqueKey(
              prisma,
              compilerDataSourceNode.id,
              tech.id,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return {
        content: undefined,
        jsonContent: undefined
      }
    }

    // Return jsonContent
    return {
      content: sourceNodeGeneration.content,
      jsonContent: sourceNodeGeneration.jsonContent
    }
  }

  async processResults(
          prisma: PrismaClient,
          projectNode: SourceNode,
          buildFromFile: BuildFromFile,
          projectDetails: ProjectDetails,
          sourceNodeGenerationData: SourceNodeGenerationData,
          content: string,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processResults()`

    // Validate
    if (buildFromFile.targetFullPath == null) {
      throw new CustomError(
        `${fnName}: buildFromFile.sourceFullPath == null`)
    }

    // Debug
    // console.log(`${fnName}: content: ${content}`)

    // Pre-process the content (if needed)
    const contentExtracts = textParsingService.getTextExtracts(content)

    content =
      textParsingService.combineTextExtracts(contentExtracts.extracts, '')

    // Write source file (if any)
    if (content != null) {

      // Upsert SourceCode node path and content
      await sourceCodePathGraphMutateService.upsertSourceCodePathAsGraph(
              prisma,
              projectDetails.projectSourceNode,
              buildFromFile.targetFullPath,
              content,
              sourceNodeGenerationData)

      // Write source file
      await fsUtilsService.writeTextFile(
              buildFromFile.targetFullPath,
              content + `\n`,
              true)  // createMissingDirs
    }

    // Update the IntentCode node with deps
    if (jsonContent.source?.deps != null) {

      await dependenciesMutateService.processDeps(
              prisma,
              projectNode,
              buildFromFile.fileNode,
              jsonContent.source.deps)
    }

    // Upsert the IntentCode file contents
    await intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
            prisma,
            projectDetails.projectIntentCodeNode,
            buildFromFile.filename,
            buildFromFile.content)

    // Upsert the compiler data node
    const compilerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeCompilerData(
              prisma,
              buildFromFile.fileNode.instanceId,
              buildFromFile.fileNode,  // parentNode
              SourceNodeNames.compilerData,
              jsonContent,
              sourceNodeGenerationData,
              buildFromFile.fileModifiedTime)

    // Print warnings and errors (must be at the end of results processing)
    intentCodeMessagesService.handleMessages(jsonContent)
  }

  async requiresRecompileByPrompt(
          prisma: PrismaClient,
          projectSourceNode: SourceNode,
          prompt: string,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.requiresRecompileByPrompt()`

    // Get source code node
    const sourceCodeNodeGeneration = await
            sourceCodePathGraphQueryService.getLatestSourceCodeGenerationByPathGraph(
              prisma,
              projectSourceNode,
              buildFromFile.targetFullPath!)

    // Debug
    // console.log(`${fnName}: sourceCodeNodeGeneration: ` +
    //             JSON.stringify(sourceCodeNodeGeneration))

    // Recompile if no prev prompt stored
    if (sourceCodeNodeGeneration == null) {
      return true
    }

    // Recompile if the file doesn't exist
    if (!await fs.existsSync(buildFromFile.targetFullPath!)) {
      return true
    }

    // Debug
    // console.log(`${fnName}: prompt: ${prompt}`)

    // console.log(`${fnName}: sourceCodeNodeGeneration.prompt: ` +
    //             `${sourceCodeNodeGeneration.prompt}`)

    // Compare prompts (without target source)
    if (prompt === sourceCodeNodeGeneration.prompt) {
      return false
    }

    // Prompts didn't match, recompile required
    return true
  }

  async run(prisma: PrismaClient,
            buildData: BuildData,
            projectNode: SourceNode,
            projectDetails: ProjectDetails,
            buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.run()`

    // console.log(`${fnName}: starting..`)

    // Verbose output
    if (ServerOnlyTypes.verbosity === true) {
      console.log(`compiling: ${buildFromFile.filename}..`)
    }

    // Get all related indexed data, including for this file
    const indexedDataSourceNodes = await
            intentCodeGraphQueryService.getAllIndexedData(
              prisma,
              projectDetails.instance.id)

    if (indexedDataSourceNodes.length === 0) {
      throw new CustomError(`${fnName}: indexedDataSourceNodes.length === 0`)
    }

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
              LlmEnvNames.compilerEnvName)

    // Get source code's full path
    buildFromFile.targetFullPath =
      sourceAssistIntentCodeService.getSourceCodeFullPath(
        projectDetails.projectSourceNode,
        buildFromFile.fileNode)

    // Get prompt
    const prompt = await
      compilerPromptService.getPrompt(
        prisma,
        projectNode,
        buildFromFile,
        buildData.extensionsData,
        indexedDataSourceNodes)

    // Get the final prompt (with existing target source)
    const finalPrompt = await
            compilerPromptService.addExistingSource(
              projectDetails.projectSourceNode,
              buildFromFile,
              prompt)

    // Already generated?
    var { content, jsonContent } = await
          this.getExistingJsonContent(
            prisma,
            buildFromFile.fileNode,
            tech,
            prompt)

    // Check if the file should be recompiled
    if (await this.requiresRecompileByPrompt(
                prisma,
                projectDetails.projectSourceNode,
                prompt,
                buildFromFile) === false) {

      return
    }

    // Run
    if (content == null ||
        jsonContent == null) {

      var status = false
      var message: string | undefined = undefined;

      ({ status, message, content, jsonContent } = await
        compilerMutateLlmService.llmRequest(
          prisma,
          adminUserProfile.id,
          tech,
          finalPrompt))  // Use the final prompt (with latest target source)
    }

    // Define SourceNodeGeneration
    // Save the initial prompt (without latest target source)
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      techId: tech.id,
      prompt: prompt
    }

    // Process results
    await this.processResults(
            prisma,
            projectNode,
            buildFromFile,
            projectDetails,
            sourceNodeGenerationData,
            content,
            jsonContent)
  }
}
