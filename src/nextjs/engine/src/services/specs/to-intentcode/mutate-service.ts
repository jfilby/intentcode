import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode, Tech } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { LlmEnvNames, ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { ExtensionsData, SourceNodeGenerationData, SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { IntentCodeCommonTypes } from '@/services/intentcode/common/types'
import { IntentCodeMessagesService } from '@/services/intentcode/common/messages-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'
import { ProjectGraphQueryService } from '@/services/graphs/project/query-service'
import { SpecsGraphMutateService } from '@/services/graphs/specs/graph-mutate-service'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service'
import { SpecsMutateLlmService } from './llm-service'
import { SpecsPathGraphMutateService } from '@/services/graphs/specs/path-graph-mutate-service'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const extensionQueryService = new ExtensionQueryService()
const fsUtilsService = new FsUtilsService()
const intentCodeMessagesService = new IntentCodeMessagesService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const projectGraphQueryService = new ProjectGraphQueryService()
const specsGraphMutateService = new SpecsGraphMutateService()
const specsGraphQueryService = new SpecsGraphQueryService()
const specsMutateLlmService = new SpecsMutateLlmService()
const specsPathGraphMutateService = new SpecsPathGraphMutateService()
const techQueryService = new TechQueryService()
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

    // Try to get existing indexer data SourceNode
    const indexerDataSourceNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              projectSpecsNode.id,  // parentId
              projectSpecsNode.instanceId,
              SourceNodeTypes.projectSpecs,
              SourceNodeNames.projectSpecs)

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

  async getIntentCodeFiles(projectIntentCodeNode: SourceNode) {

    // Get IntentCode path
    const intentCodePath = (projectIntentCodeNode.jsonContent as any).path

    // Walk dir
    var mdFilesList: string[] = []

    await walkDirService.walkDir(
            intentCodePath,
            mdFilesList,
            {
              recursive: true,
              fileExts: ['.md']
            })

    // Read files
    var intentCodeFiles: any = {}

    for (const mdFilename of mdFilesList) {

      // Get relative path
      const relativePath = mdFilename.slice(intentCodePath.length)

      // Read file
      const content = await
              fs.readFileSync(
                mdFilename,
                { encoding: 'utf8', flag: 'r' })

      // Add to intentCodeFiles
      intentCodeFiles[relativePath] = content
    }

    // Return
    return intentCodeFiles
  }

  async getPrompt(
          prisma: PrismaClient,
          projectNode: SourceNode,
          projectSpecsNode: SourceNode,
          projectIntentCodeNode: SourceNode,
          extensionsData: ExtensionsData,
          buildFromFiles: BuildFromFile[]) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Start the prompt
    var prompt = 
          `## Instructions\n` +
          `\n` +
          `Convert the specs (natural language) into IntentCode, which is ` +
          `closer to source, but focuses on intent.\n` +
          `\n` +
          `Split the functionality across multiple files, using the single ` +
          `responsibility principle.\n` +
          `\n` +
          `The available extensions should be your guide regarding the \n` +
          `expected tech stack.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          `## Fields\n` +
          `\n` +
          ServerOnlyTypes.messagesPrompting +
          `\n` +
          `The intentcode array contains a list of filenames and content.\n` +
          `\n` +
          `## Example IntentCode\n` +
          `\n` +
          '```md\n`' +
          `# Calc\n` +
          `\n` +
          `## parseInput()\n` +
          `\n` +
          `- Convert input parameter str to string array of numbers and ` +
          `  operations.\n` +
          `- Return the answer.\n` +
          '```\n`' +
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
          `  "intentcode": {\n` +
          `    "<path>/<target-filename.ext>.md": "<content>"\n` +
          `  }\n` +
          `}\n` +
          `\n`

    // Add the spec files
    prompt +=
      `## Specs\n` +
      `\n`

    // Iterate spec files
    const specsPath = (projectSpecsNode.jsonContent as any).path

    for (const buildFromFile of buildFromFiles) {

      // Debug
      // console.log(`${fnName}: ${buildFromFile.filename}: ` +
      //             `${buildFromFile.content}`)

      // Get relative filename
      const relativePath = buildFromFile.filename.slice(specsPath.length)

      // Add to prompt
      prompt +=
        `### ${relativePath}\n` +
        `\n` +
        '```md\n' +
        buildFromFile.content +
        `\n` +
        '```'
    }

    // Add installed extensions
    const projectExtensionsPrompting = await
            extensionQueryService.getAsPrompting(
              prisma,
              projectSpecsNode.instanceId)

    if (projectExtensionsPrompting != null) {

      prompt +=
        `## Project extensions\n` +
        `\n` +
        `These extensions have been installed for this project.\n` +
        `\n` +
        projectExtensionsPrompting
    }

    // Add existing IntentCode files
    const intentCodeFiles = await
            this.getIntentCodeFiles(projectIntentCodeNode)

    if (intentCodeFiles.size > 0) {

      // Add prompting
      prompt +=
        `## IntentCode files\n` +
        `\n` +
        `These are the existing IntentCode files.\n` +
        `\n`

      // Add each file
      for (const [intentCodeFilename, content] of
           Object.entries(intentCodeFiles)) {

        prompt +=
          `### ${intentCodeFilename}\n` +
          `\n` +
          '```md\n' +
          `${content}\n` +
          '```' +
          `\n`
      }
    }

    // Debug
    // console.log(`${fnName}: prompt: ${prompt}`)

    // Return
    return prompt
  }

  async processQueryResults(
            prisma: PrismaClient,
            projectSpecsNode: SourceNode,
            projectIntentCodeNode: SourceNode,
            sourceNodeGenerationData: SourceNodeGenerationData,
            jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.processQueryResults()`

    // Validate
    if (projectSpecsNode == null) {
      throw new CustomError(`${fnName}: projectSpecsNode == null`)
    }

    // Debug
    console.log(`${fnName}: jsonContent: ` + JSON.stringify(jsonContent))

    // Write IntentCode files
    if (jsonContent.intentcode != null) {

      // Get IntentCode path
      const intentCodePath = (projectIntentCodeNode.jsonContent as any).path

      // Iterate files
      for (const [intentCodeRelativePath, content] of
           Object.entries(jsonContent.intentcode)) {

        // Determine intentCodeFullPath
        const intentCodeFullPath =
                `${intentCodePath}${path.sep}${intentCodeRelativePath}`

        // Get/create SourceCode node path
        await intentCodePathGraphMutateService.upsertIntentCodePathAsGraph(
                prisma,
                projectIntentCodeNode,
                intentCodeFullPath)

        // Write source file
        await fsUtilsService.writeTextFile(
                intentCodeFullPath,
                content + `\n`,
                true)  // createMissingDirs
      }
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
          projectNode: SourceNode,
          projectSpecsNode: SourceNode,
          projectIntentCodeNode: SourceNode,
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
            techQueryService.getTechByEnvKey(
              prisma,
              LlmEnvNames.specsTranslatorEnvName)

    // Get prompt
    const prompt = await
      this.getPrompt(
        prisma,
        projectNode,
        projectSpecsNode,
        projectIntentCodeNode,
        buildData.extensionsData,
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
              specsMutateLlmService.llmRequest(
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
            projectSpecsNode,
            projectIntentCodeNode,
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

    // Get project specs node
    const projectSpecsNode = await
            specsGraphQueryService.getSpecsProject(
              prisma,
              projectNode)

    // Get projectIntentCodeNode
    const projectIntentCodeNode = await
            projectGraphQueryService.getIntentCodeProjectNode(
              prisma,
              projectNode)

    // Validate
    if (projectSpecsNode == null ||
        projectIntentCodeNode == null) {

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
          `${(projectIntentCodeNode.jsonContent as any).path}${path.sep}` +
          `${relativePath}`
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
            projectNode,
            projectSpecsNode,
            projectIntentCodeNode,
            buildFromFiles)
  }
}
