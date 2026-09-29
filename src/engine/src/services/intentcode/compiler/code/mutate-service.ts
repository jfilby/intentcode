import { CustomError } from 'serene-core-server'
import chalk from 'chalk'
import fs from 'fs'
import { blake3 } from '@noble/hashes/blake3'
import { AiModelService } from '@/services/ai/ai-model-service.js'
import { PrismaClient, SourceNode } from '@/prisma/client.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { Emoticons, IntentCodeAiTasks, ProjectDetails, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { SourceNodeNames, SourceNodeGenerationData, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { CompilerLlmService } from './llm-service.js'
import { CompilerPromptService } from './prompt-service.js'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service.js'
import { FsUtilsService } from '@/services/utils/fs-utils-service.js'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service.js'
import { IntentCodeMessagesService } from '../../common/messages-service.js'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service.js'
import { SourceAssistIntentCodeService } from '../../source/source-prompt.js'
import { SourceCodePathGraphMutateService } from '@/services/graphs/source-code/path-graph-mutate-service.js'
import { SourceCodePathGraphQueryService } from '@/services/graphs/source-code/path-graph-query-service.js'
import { TextService } from '@/services/utils/text-service.js'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const aiModelService = new AiModelService()
const compilerLlmService = new CompilerLlmService()
const textService = new TextService()
const compilerPromptService = new CompilerPromptService()
const dependenciesMutateService = new DependenciesMutateService()
const fsUtilsService = new FsUtilsService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const sourceAssistIntentCodeService = new SourceAssistIntentCodeService()
const sourceCodePathGraphMutateService = new SourceCodePathGraphMutateService()
const sourceCodePathGraphQueryService = new SourceCodePathGraphQueryService()

// Class
export class CompilerMutateService {

  // Consts
  clName = 'CompilerMutateService'

  // Code
  async getExistingJsonContent(
          prisma: PrismaClient,
          intentFileNode: SourceNode,
          modelId: string,
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
              modelId,
              promptHash)

    if (sourceNodeGeneration == null ||
        sourceNodeGeneration.prompt !== prompt) {

      return {
        content: undefined,
        jsonContent: undefined
      }
    }

    // Debug
    // console.log(`${fnName}: found cached result in sourceNodeGeneration.id: ` +
    //   `${sourceNodeGeneration.id}`)

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
    if (content == null) {

      // Handle throw or exit
      if (jsonContent.errors != null &&
          jsonContent.errors.length > 0) {

        // Print warnings and errors (must be at the end of results processing)
        intentCodeMessagesService.handleMessages(jsonContent)

        // Output
        console.log(`${chalk.bold.red(Emoticons.cross)} failed to compile`)

        // Exit (with error)
        process.exit(1)
      } else {
        // Throw an exception (content not specified and no errors)
        throw new CustomError(`${fnName}: content == null (and no errors)`)
      }
    }

    if (buildFromFile.targetFullPath == null) {
      throw new CustomError(
        `${fnName}: buildFromFile.sourceFullPath == null`)
    }

    // Debug
    // console.log(`${fnName}: content: ${content}`)

    // Pre-process the content (strip any markdown extracts)
    content = textService.extractCode(content)

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

    // Print warnings and errors if not yet displayed, ideally at the end of
    // processing
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
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.min) {

      console.log(``)
      console.log(`compiling: ${buildFromFile.relativePath}..`)
    }

    // The model id
    const modelId = aiModelService.getModelId(IntentCodeAiTasks.compiler)

    // Get source code's full path
    buildFromFile.targetFullPath =
      sourceAssistIntentCodeService.getSourceCodeFullPath(
        projectDetails.projectSourceNode,
        buildFromFile.fileNode)

    // Get prompt
    const { prompt, promptWithoutSource } = await
      compilerPromptService.getPrompt(
        prisma,
        buildData,
        buildFromFile,
        projectNode,
        projectDetails,
        buildData.extensionsData)

    // Already generated?
    var { content, jsonContent } = await
          this.getExistingJsonContent(
            prisma,
            buildFromFile.fileNode,
            modelId,
            promptWithoutSource)

    // Check if the file should be recompiled
    if (await this.requiresRecompileByPrompt(
                prisma,
                projectDetails.projectSourceNode,
                promptWithoutSource,
                buildFromFile) === false) {

      // Output
      console.log(`${chalk.bold.green(Emoticons.tick)} compiled from cache`)

      // Return
      return
    }

    // Run
    if (content == null ||
        jsonContent == null) {

      var status = false
      var message: string | undefined = undefined;

      ({ status, message, content, jsonContent } = await
        compilerLlmService.llmRequest(
          prisma,
                    IntentCodeAiTasks.compiler,
          prompt))  // Use the final prompt (with latest target source)
    }

    // Define SourceNodeGeneration
    // Save the initial prompt (without latest target source)
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      modelId: modelId,
      prompt: promptWithoutSource
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

    // Output
    console.log(`${chalk.bold.green(Emoticons.tick)} compiled OK`)
  }
}
