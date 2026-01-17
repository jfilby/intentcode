import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { ServerTestTypes } from '@/types/server-test-types'
import { SpecsTechStackMutateLlmService } from './llm-service'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { LlmEnvNames, ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionsData, SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeMessagesService } from '@/services/intentcode/common/messages-service'
import { ProjectsQueryService } from '@/services/projects/query-service'
import { SpecsGraphMutateService } from '@/services/graphs/specs/graph-mutate-service'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service'
import { SpecsPathGraphMutateService } from '@/services/graphs/specs/path-graph-mutate-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const extensionQueryService = new ExtensionQueryService()
const fsUtilsService = new FsUtilsService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const projectsQueryService = new ProjectsQueryService()
const specsGraphMutateService = new SpecsGraphMutateService()
const specsGraphQueryService = new SpecsGraphQueryService()
const specsPathGraphMutateService = new SpecsPathGraphMutateService()
const specsTechStackMutateLlmService = new SpecsTechStackMutateLlmService()
const techQueryService = new TechQueryService()
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
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.indexFileWithLlm()`

    // Verbose output
    if (ServerOnlyTypes.verbosity === true) {

      console.log(`indexing: ${buildFromFile.filename}..`)
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
              LlmEnvNames.specsTranslatorEnvName)

    // Get prompt
    const prompt = await
      this.getPrompt(
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

      const llmResults = await
              specsTechStackMutateLlmService.llmRequest(
                prisma,
                adminUserProfile.id,
                tech,
                prompt)

      jsonContent = llmResults.queryResults.json
    }

    // Define SourceNodeGeneration
    const sourceNodeGenerationData: SourceNodeGenerationData = {
      techId: tech.id,
      prompt: prompt
    }

    // Save the index data
    await this.processQueryResults(
            prisma,
            projectNode,
            projectSpecsNode,
            buildFromFile,
            sourceNodeGenerationData,
            jsonContent)

    // Return
    return
  }

  async processTechStack(
          prisma: PrismaClient,
          buildData: BuildData,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.processTechStack()`

    // Get project specs node
    const projectSpecsNode = await
            specsGraphQueryService.getSpecsProject(
              prisma,
              projectNode)

    // Validate
    if (projectSpecsNode == null) {
      return
    }

    // Debug
    // console.log(`${fnName}: path: ` +
    //             JSON.stringify((projectSpecsNode.jsonContent as any).path))

    // Walk dir
    var mdFilesList: string[] = []

    await walkDirService.walkDir(
            (projectSpecsNode.jsonContent as any).path,
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

    // Determine targetFullPath
    const targetFullPath =
            `${(projectSpecsNode.jsonContent as any).path}${path.sep}` +
            `.intentcode/tech-stack.json`

    // Build file
    const buildFromFile: BuildFromFile = {
      filename: techStackFilename,
      content: techStack,
      fileModifiedTime: fileModifiedTime,
      fileNode: techStackNode,
      targetFileExt: '.json',
      targetFullPath: targetFullPath
    }

    // Process tech-stack.md
    await this.processTechStackFileWithLlm(
            prisma,
            buildData,
            projectNode,
            projectSpecsNode,
            buildFromFile)
  }

  async getPrompt(
          prisma: PrismaClient,
          projectNode: SourceNode,
          extensionsData: ExtensionsData,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Start the prompt
    var prompt = 
          `## Instructions\n` +
          `\n` +
          `Convert the Tech stack spec (natural language) into json guided ` +
          `by the example output.\n` +
          `\n` +
          `You need to identify the best matching extensions in the System ` +
          `project, as well as any dependencies as required by the spec.\n` +
          `\n` +
          `If an extension is already listed as installed for the User ` +
          `project then there needs to be a good reason not to list it.\n` +
          `\n` +
          `Any element in the tech stack that isn't supported by an ` +
          `extension or dependency needs to be included in the errors.\n` +
          `\n` +
          `## Example output\n` +
          `\n` +
          `{\n` +
          `  "warnings": [],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "to": 7,\n` +
          `      "text": "No extension for <tech> available."\n` +
          `    }\n` +
          `  ],\n` +
          `  "extensions": {\n` +
          `    "<id>": "<minVersionNo>",\n` +
          `  },\n` +
          `  "deps": {\n` +
          `    "<name>": "<minVersion>"\n` +
          `  }\n` +
          `}\n` +
          `\n`

    // Add the tech stack spec
    prompt +=
      `## Tech stack spec\n` +
      `\n` +
      '```md\n' +
      buildFromFile.content +
      `\n` +
      '```'

    // System (available extensions)
    const systemProject = await
            projectsQueryService.getProject(
              prisma,
              ServerOnlyTypes.systemProjectName)

    const systemExtensionsPrompting = await
            extensionQueryService.getAsPrompting(
              prisma,
              systemProject.id)

    if (systemExtensionsPrompting != null) {

      prompt +=
        `## System extensions\n` +
        `\n` +
        `These extensions are those that are available to be installed in ` +
        `the user project.\n` +
        `\n` +
        systemExtensionsPrompting
    }

    // Add installed extensions
    const projectExtensionsPrompting = await
            extensionQueryService.getAsPrompting(
              prisma,
              systemProject.id)

    if (projectExtensionsPrompting != null) {

      prompt +=
        `## User project extensions\n` +
        `\n` +
        `These extensions are those that are already installed for this ` +
        `project.\n` +
        `\n` +
        projectExtensionsPrompting
    }

    // Debug
    // console.log(`${fnName}: prompt: ${prompt}`)
    // throw new CustomError(`${fnName}: TEST STOP`)

    // Return
    return prompt
  }

  async processQueryResults(
          prisma: PrismaClient,
          projectNode: SourceNode,
          projectSpecsNode: SourceNode,
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

    // Write .intentcode/tech-stack.json
    if (jsonContent.extensions != null ||
        jsonContent.deps != null) {

      // Determine techStackJson and content
      var techStackJson: any = {}

      techStackJson.extensions = jsonContent.extensions
      techStackJson.deps = jsonContent.deps

      const content = JSON.stringify(techStackJson)

      // Get/create SourceCode node path
      await specsPathGraphMutateService.getOrCreateSpecsPathAsGraph(
              prisma,
              projectSpecsNode,
              buildFromFile.targetFullPath!)

      // Write source file
      await fsUtilsService.writeTextFile(
              buildFromFile.targetFullPath!,
              content,
              true)  // createMissingDirs
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
