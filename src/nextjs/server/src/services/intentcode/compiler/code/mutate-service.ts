import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BuildData, BuildIntentFile } from '@/types/build-types'
import { IntentCodeCommonTypes } from '../../common/types'
import { LlmEnvNames, ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { SourceNodeNames, SourceNodeGenerationData, SourceNodeTypes, ExtensionsData } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { CompilerMutateLlmService } from './llm-service'
import { CompilerQueryService } from './query-service'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { DependenciesPromptService } from '@/services/graphs/dependencies/prompt-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { GraphQueryService } from '@/services/graphs/intentcode/graph-query-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodeMessagesService } from '../../common/messages-service'
import { SourceCodePathGraphMutateService } from '@/services/graphs/source-code/path-graph-mutate-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const compilerMutateLlmService = new CompilerMutateLlmService()
const compilerQueryService = new CompilerQueryService()
const dependenciesMutateService = new DependenciesMutateService()
const dependenciesPromptService = new DependenciesPromptService()
const fsUtilsService = new FsUtilsService()
const graphQueryService = new GraphQueryService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const sourceCodePathGraphMutateService = new SourceCodePathGraphMutateService()
const techQueryService = new TechQueryService()
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

  async getPrompt(
          prisma: PrismaClient,
          projectNode: SourceNode,
          buildIntentFile: BuildIntentFile,
          extensionsData: ExtensionsData,
          indexedDataSourceNodes: SourceNode[]) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Get intentFileRelativePath
    const intentFileRelativePath =
              (buildIntentFile.intentFileNode.jsonContent as any).relativePath

    // Get SourceCode relative path
    const sourceFileRelativePath =
            intentFileRelativePath.slice(
              0,
              intentFileRelativePath.length - ServerOnlyTypes.dotMdFileExt.length)

    // Get rules by targetLang
    const targetLangPrompting =
            compilerQueryService.getSkillPrompting(
              extensionsData,
              buildIntentFile.targetFileExt)

    // Get deps prompting
    const depsPrompting = await
            dependenciesPromptService.getDepsPrompting(
              prisma,
              projectNode,
              buildIntentFile.intentFileNode,
              sourceFileRelativePath)

    // Debug
    // console.log(`${fnName}: targetLangPrompting: ${targetLangPrompting}`)

    // Start the prompt
    var prompt =
          `## Instructions\n` +
          `\n` +
          `You need to:\n` +
          `- Determine the assumptions needed in the IntentCode to make it ` +
          `  unambiguous.\n` +
          `- Scan for warnings and errors. If there are any errors then ` +
          `  don't return any target source.\n` +
          `- Try to fix and errors and warnings in the fixedIntentCode ` +
          `  field.\n` +
          `- Convert the input IntentCode (if no errors) to ` +
          `  ${buildIntentFile.targetFileExt} source code.\n` +
          `- Use the indexed data for this file as a structural starting ` +
          `  point. Imports depend on this to be accurate.\n` +
          `- Write idiomatic code, this is for actual use.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          `## Assumptions\n` +
          `\n` +
          `Useful assumptions include:\n` +
          `- Importing decisions based on more than one option.\n` +
          `- Implementing functionality using known functions where ` +
          `  possible, make use of functions available in index data or ` +
          `  standard libraries.\n` +
          `\n` +
          `Do not make these assumptions:\n` +
          `- Imports not based on index data or known standard libraries.\n` +
          `\n` +
          `General rules:\n` +
          `- Include a probability from 0..1.\n ` +
          `- Different levels: file or line. The line level requires line, ` +
          `  from and to fields.\n` +
          `- Don't guess, they need to be based on high probabilities at ` +
          `  worst.\n` +
          `- Don't assume without data: if you don't know something ` +
          `  critical then list it as an error.\n` +
          `\n` +
          `## Messages\n` +
          `\n` +
          `Warnings and errors might not have a line, from and to numbers, ` +
          `but they always have a text field.\n` +
          `\n` +
          depsPrompting +
          `\n` +
          `## Example output\n` +
          `\n` +
          `This is an example of the output structure only. Don't try to ` +
          `use it as a source of any kind of data.\n` +
          `\n` +
          `{\n` +
          `  "assumptions": [\n` +
          `    {\n` +
          `      "probability": "0.95",\n` +
          `      "level": "file",\n` +
          `      "type": "import",\n` +
          `      "assumption": ".."\n` +
          `    }\n` +
          `  ],\n` +
          `  "warnings": [],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "to": 7,\n` +
          `      "text": "Variable x is undefined"\n` +
          `    }\n` +
          `  ],\n` +
          `  "fixedIntentCode": "..",\n` +
          `  "targetSource": ".."\n` +
          `  "deps": [\n` +
          `    {\n` +
          `      "delta": "set",\n` +
          `      "name": "..",\n` +
          `      "minVersion": ".."\n` +
          `    }\n` +
          `  ]\n` +
          `}\n` +
          `\n`

    // Target lang prompting
    if (targetLangPrompting.length > 0) {

      prompt +=
        `## ${buildIntentFile.targetFileExt} specific\n` +
        targetLangPrompting +
        `\n`
    }

    // Continue prompt
    prompt +=
      `## IntentCode\n` +
      `\n` +
      '```md\n' +
      buildIntentFile.intentCode +
      `\n` +
      '```\n' +
      `\n` +
      `## Index data\n` +
      `\n`

    // List all indexed data
    if (indexedDataSourceNodes.length > 0) {

      for (const indexedDataSourceNode of indexedDataSourceNodes) {

        // Validate
        if ((indexedDataSourceNode as any).parent == null) {
          throw new CustomError(`${fnName}: indexedDataSourceNode.parent`)
        }

        // Get fields
        const intentCodeFileSourceNode = (indexedDataSourceNode as any).parent
        const relativePath = intentCodeFileSourceNode.jsonContent.relativePath

        const astTree =
          JSON.stringify((indexedDataSourceNode.jsonContent as any).astTree)

        prompt +=
          `### File: ${relativePath}\n` +
          `\n` +
          `${astTree}\n\n`
      }
    } else {
      prompt += `None available.`
    }

    // Return
    return prompt
  }

  async processResults(
          prisma: PrismaClient,
          projectNode: SourceNode,
          buildIntentFile: BuildIntentFile,
          sourceCodeProjectNode: SourceNode,
          sourceNodeGenerationData: SourceNodeGenerationData,
          content: string,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processResults()`

    // Write source file (if any)
    if (content != null) {

      // Get paths
      const projectSourcePath = (sourceCodeProjectNode.jsonContent as any).path

      const intentFileRelativePath =
              (buildIntentFile.intentFileNode.jsonContent as any).relativePath

      // Validate
      if (projectSourcePath == null) {
        throw new CustomError(`${fnName}: projectSourcePath == null`)
      }

      if (intentFileRelativePath == null) {
        throw new CustomError(`${fnName}: intentFileRelativePath == null`)
      }

      if (!intentFileRelativePath.endsWith(ServerOnlyTypes.dotMdFileExt)) {

        throw new CustomError(
          `${fnName}: intentFileRelativePath doesn't end with ` +
          `${ServerOnlyTypes.dotMdFileExt}`)
      }

      // Get SourceCode relative path
      const sourceFileRelativePath =
              intentFileRelativePath.slice(
                0,
                intentFileRelativePath.length - ServerOnlyTypes.dotMdFileExt.length)

      const fullPath = projectSourcePath + sourceFileRelativePath

      // Get/create SourceCode node path
      await sourceCodePathGraphMutateService.getOrCreateSourceCodePathAsGraph(
              prisma,
              sourceCodeProjectNode,
              fullPath,
              content,
              sourceNodeGenerationData)

      // Write source file
      await fsUtilsService.writeTextFile(
              fullPath,
              content,
              true)  // createMissingDirs
    }

    // Update the IntentCode node with deps
    if (jsonContent.deps != null) {

      await dependenciesMutateService.processDeps(
              prisma,
              projectNode,
              buildIntentFile.intentFileNode,
              jsonContent.deps)
    }

    // Upsert the compiler data node
    const compilerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeCompilerData(
              prisma,
              buildIntentFile.intentFileNode.instanceId,
              buildIntentFile.intentFileNode,  // parentNode
              SourceNodeNames.compilerData,
              jsonContent,
              sourceNodeGenerationData,
              buildIntentFile.fileModifiedTime)

    // Print warnings and errors (must be at the end of results processing)
    intentCodeMessagesService.handleMessages(jsonContent)
  }

  async run(prisma: PrismaClient,
            buildData: BuildData,
            projectNode: SourceNode,
            intentCodeProjectNode: SourceNode,
            sourceCodeProjectNode: SourceNode,
            buildIntentFile: BuildIntentFile) {

    // Debug
    const fnName = `${this.clName}.run()`

    // console.log(`${fnName}: starting..`)

    // Verbose output
    if (ServerOnlyTypes.verbosity === true) {
      console.log(`compiling: ${buildIntentFile.intentCodeFilename}..`)
    }

    // Get all related indexed data, including for this file
    const indexedDataSourceNodes = await
            graphQueryService.getAllIndexedData(
              prisma,
              intentCodeProjectNode.instanceId)

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

    // Get prompt
    const prompt = await
      this.getPrompt(
        prisma,
        projectNode,
        buildIntentFile,
        buildData.extensionsData,
        indexedDataSourceNodes)

    // Already generated?
    var { content, jsonContent } = await
          this.getExistingJsonContent(
            prisma,
            buildIntentFile.intentFileNode,
            tech,
            prompt)

    // Run
    if (jsonContent == null) {

      var status = false
      var message: string | undefined = undefined;

      ({ status, message, content, jsonContent } = await
              compilerMutateLlmService.llmRequest(
                prisma,
                adminUserProfile.id,
                tech,
                prompt))
    }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      techId: tech.id,
      prompt: prompt
    }

    // Process results
    await this.processResults(
            prisma,
            projectNode,
            buildIntentFile,
            sourceCodeProjectNode,
            sourceNodeGenerationData,
            content,
            jsonContent)
  }
}
