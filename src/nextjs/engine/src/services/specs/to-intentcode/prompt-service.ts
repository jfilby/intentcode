import fs from 'fs'
import { PrismaClient, SourceNode } from '@prisma/client'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeCommonTypes } from '@/services/intentcode/common/types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
const extensionQueryService = new ExtensionQueryService()
const projectsQueryService = new ProjectsQueryService()
const walkDirService = new WalkDirService()

// Class
export class SpecsToIntentCodePromptService {

  // Consts
  clName = 'SpecsToIntentCodePromptService'

  // Code
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
          buildData: BuildData,
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
          `      "projectNo": <projectNo>,\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "to": 7,\n` +
          `      "text": "No extension for <tech> available."\n` +
          `    }\n` +
          `  ],\n` +
          `  "intentcode": [\n `+
          `    {\n` +
          `      "projectNo": <projectNo>,\n` +
          `      "relativePath", "<target-filename.ext>.md",\n` +
          `      "content": "<content>"\n` +
          `    }\n` +
          `  ]\n` +
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

    // Add numbered projects
    if (buildData.numberedProjectsMap != null) {

      prompt +=
        projectsQueryService.getNumberedProjectsPrompt(
          buildData.numberedProjectsMap)
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
}
