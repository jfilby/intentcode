import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeCommonTypes } from '@/services/intentcode/common/types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { IntentCodePromptingService } from '@/services/intentcode/build/prompting-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
const extensionQueryService = new ExtensionQueryService()
const intentCodePromptingService = new IntentCodePromptingService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class SpecsToIntentCodePromptService {

  // Consts
  clName = 'SpecsToIntentCodePromptService'

  // Code
  async getPrompt(
          prisma: PrismaClient,
          projectSpecsNode: SourceNode,
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
    if (buildData.projectsMap != null) {

      prompt +=
        projectsQueryService.getProjectsPrompting(
          buildData.projectsMap)
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
    const intentCodePrompting = await
            intentCodePromptingService.getAllPrompting(buildData)

    if (intentCodePrompting != null) {
      prompt += intentCodePrompting
    }

    // Debug
    // console.log(`${fnName}: prompt: ${prompt}`)

    // Return
    return prompt
  }
}
