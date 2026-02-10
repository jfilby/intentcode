import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { CustomError } from '@/serene-core-server/types/errors'
import { IntentCodeCommonTypes } from '@/services/intentcode/common/types'
import { FileOps, ServerOnlyTypes } from '@/types/server-only-types'
import { CompilerQueryService } from '@/services/intentcode/compiler/code/query-service'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { IntentCodePromptingService } from '@/services/intentcode/build/prompting-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
const compilerQueryService = new CompilerQueryService()
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

    // Get skills used across files
    const skillsMap =
      compilerQueryService.getMultiFileSkillPrompting(
        buildData,
        buildFromFiles)

    // Start the prompt
    var prompt = 
          `## Instructions\n` +
          `\n` +
          `Convert the specs (natural language) into IntentCode, which is ` +
          `closer to source, but focuses on intent. Don't recreate existing ` +
          `IntentCode which is already correct. Try to adjust existing ` +
          `IntentCode instead of creating new approaches.\n` +
          `\n` +
          `Split the functionality across multiple files, using the single ` +
          `responsibility principle.\n` +
          `\n` +
          `The available extensions should be your guide regarding the \n` +
          `expected tech stack.\n` +
          `\n` +
          `The filename convention of the IntentCode files should mirror ` +
          `that of the target source which is usually covered in the ` +
          `appropriate skill prompting.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          `## Fields\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodeFileDeltasPrompting +
          `\n` +
          ServerOnlyTypes.messagesPrompting +
          `\n` +
          `- The intentCode array contains a list of fileDeltas.\n` +
          `\n` +
          `## Example JSON output\n` +
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
          `  "intentCode": [\n `+
          `    {\n` +
          `      "projectNo": <projectNo>,\n` +
          `      "fileOp": "<fileOp>",\n` +
          `      "relativePath": "<targetFilename>.<srcExt>.md",\n` +
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
        '```\n' +
        `\n`
    }

    // Add numbered projects
    if (buildData.projects != null) {

      prompt +=
        projectsQueryService.getProjectsPrompting(buildData.projects)
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

    // Target lang prompting
    for (const [targetFileExt, targetLangPrompting] of skillsMap.entries()) {

      prompt +=
        `## ${targetFileExt} specific\n` +
        targetLangPrompting +
        `\n`
    }

    // Debug
    // console.log(`${fnName}: prompt: ${prompt}`)

    // Return
    return prompt
  }
}
