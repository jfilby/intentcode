import fs from 'fs'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { BuildData, BuildFromFile } from '@/types/build-types'
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
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'
import { IntentCodePathGraphQueryService } from '@/services/graphs/intentcode/path-graph-query-service'
import { SourceAssistIntentCodeService } from '../../source/source-prompt'
import { SourceCodePathGraphMutateService } from '@/services/graphs/source-code/path-graph-mutate-service'
import { SourceCodePathGraphQueryService } from '@/services/graphs/source-code/path-graph-query-service'

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
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const intentCodePathGraphQueryService = new IntentCodePathGraphQueryService()
const sourceAssistIntentCodeService = new SourceAssistIntentCodeService()
const sourceCodePathGraphMutateService = new SourceCodePathGraphMutateService()
const sourceCodePathGraphQueryService = new SourceCodePathGraphQueryService()
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
          projectSourceCodeNode: SourceNode,
          buildFromFile: BuildFromFile,
          extensionsData: ExtensionsData,
          indexedDataSourceNodes: SourceNode[]) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Get intentFileRelativePath
    const intentFileRelativePath =
              (buildFromFile.fileNode.jsonContent as any).relativePath

    // Get rules by targetLang
    const targetLangPrompting =
            compilerQueryService.getSkillPrompting(
              extensionsData,
              buildFromFile.targetFileExt)

    // Get deps prompting
    const depsPrompting = await
            dependenciesPromptService.getDepsPrompting(
              prisma,
              projectNode,
              buildFromFile.fileNode,
              buildFromFile.targetFullPath)

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
          `  ${buildFromFile.targetFileExt} source code.\n` +
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
          `## Fields\n` +
          `\n` +
          ServerOnlyTypes.messagesPrompting +
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
        `## ${buildFromFile.targetFileExt} specific\n` +
        targetLangPrompting +
        `\n`
    }

    // Continue prompt
    prompt +=
      `## IntentCode\n` +
      `\n` +
      '```md\n' +
      buildFromFile.content +
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

    // Existing source code
    if (ServerOnlyTypes.includeExistingSourceMode === true) {

      const existingSourcePrompting = await
              sourceAssistIntentCodeService.getExistingSourcePrompting(
                projectSourceCodeNode,
                buildFromFile)

      if (existingSourcePrompting != null) {
        prompt += existingSourcePrompting
      }
    }

    // Return
    return prompt
  }

  async processResults(
          prisma: PrismaClient,
          projectNode: SourceNode,
          buildFromFile: BuildFromFile,
          projectIntentCodeNode: SourceNode,
          projectSourceCodeNode: SourceNode,
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

    // Write source file (if any)
    if (content != null) {

      // Upsert SourceCode node path and content
      await sourceCodePathGraphMutateService.upsertSourceCodePathAsGraph(
              prisma,
              projectSourceCodeNode,
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
    if (jsonContent.deps != null) {

      await dependenciesMutateService.processDeps(
              prisma,
              projectNode,
              buildFromFile.fileNode,
              jsonContent.deps)
    }

    // Upsert the IntentCode file contents
    await intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
            prisma,
            projectIntentCodeNode,
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

  async requiresRecompile(
          projectIntentCodeNode: SourceNode,
          projectSourceCodeNode: SourceNode,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.requiresRecompile()`

    // Get the IntentCode node
    const intentCodeNode = await
            intentCodePathGraphQueryService.getIntentCodePathAsGraph(
              prisma,
              projectIntentCodeNode,
              buildFromFile.filename)

    // Has the IntentCode file's content been changed?
    if (buildFromFile.content !== intentCodeNode?.content) {

      console.log(`IntentFile has changed, recompile required..`)
      console.log(`<${buildFromFile.content}> vs <${intentCodeNode?.content}\n>`)
      return true
    }

    // Get the source file node
    const sourceFileNode = await
            sourceCodePathGraphQueryService.getSourceCodePathAsGraph(
              prisma,
              projectSourceCodeNode,
              buildFromFile.targetFullPath!)

    // Read existing source file (if it exists)
    var existingSourceCode = ''

    if (await fs.existsSync(buildFromFile.targetFullPath!)) {

      existingSourceCode = await
        fs.readFileSync(buildFromFile.targetFullPath!, 'utf-8')
    }

    // Has the source file's content been changed?
    if (existingSourceCode !== sourceFileNode?.content + `\n`) {

      console.log(`Target source file has changed, recompile required..`)
      console.log(`<${existingSourceCode}> vs <${sourceFileNode?.content}\n>`)
      return true
    }

    // No change
    return false
  }

  async run(prisma: PrismaClient,
            buildData: BuildData,
            projectNode: SourceNode,
            projectIntentCodeNode: SourceNode,
            projectSourceCodeNode: SourceNode,
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
            graphQueryService.getAllIndexedData(
              prisma,
              projectIntentCodeNode.instanceId)

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
        projectSourceCodeNode,
        buildFromFile.fileNode)

    // Get prompt
    const prompt = await
      this.getPrompt(
        prisma,
        projectNode,
        projectSourceCodeNode,
        buildFromFile,
        buildData.extensionsData,
        indexedDataSourceNodes)

    // Already generated?
    var { content, jsonContent } = await
          this.getExistingJsonContent(
            prisma,
            buildFromFile.fileNode,
            tech,
            prompt)

    // Check if the file should be recompiled
    if (await this.requiresRecompile(
                projectIntentCodeNode,
                projectSourceCodeNode,
                buildFromFile) === false) {

      return
    }

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
            buildFromFile,
            projectIntentCodeNode,
            projectSourceCodeNode,
            sourceNodeGenerationData,
            content,
            jsonContent)
  }
}
