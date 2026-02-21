import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeCommonTypes } from '../common/types'
import { AnalyzerPromptTypes, FileOps, ServerOnlyTypes } from '@/types/server-only-types'
import { CompilerQueryService } from '../compiler/code/query-service'
import { DependenciesPromptService } from '@/services/graphs/dependencies/prompt-service'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { IntentCodePromptingService } from '../build/prompting-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
const compilerQueryService = new CompilerQueryService()
const dependenciesPromptService = new DependenciesPromptService()
const extensionQueryService = new ExtensionQueryService()
const intentCodePromptingService = new IntentCodePromptingService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class IntentCodeAnalyzerPromptService {

  // Consts
  clName = 'IntentCodeAnalyzerPromptService'

  // Code
  async getPrompt(
          prisma: PrismaClient,
          promptType: AnalyzerPromptTypes,
          projectNode: SourceNode,
          buildData: BuildData,
          buildFromFiles: BuildFromFile[],
          suggestion?: any) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Determine top-level instructions if not set
    var primaryInstructions = ``

    if (promptType === AnalyzerPromptTypes.createSuggestions) {

      primaryInstructions = `You need to run a analysis on the IntentCode.\n`

    } else if (promptType === AnalyzerPromptTypes.chatAboutSuggestion) {

      primaryInstructions =
        `Chat with the user about the generated suggestion.\n`

    } else {
      throw new CustomError(`${fnName}: unhandled promptType: ${promptType}`)
    }

    /* Get deps prompting
    const depsPrompting = await
            dependenciesPromptService.getDepsPrompting(
              prisma,
              projectNode,
              buildFromFile.fileNode,
              buildFromFile.targetFullPath) */

    // Debug
    // console.log(`${fnName}: targetLangPrompting: ${targetLangPrompting}`)

    // Start the prompt
    var prompt =
          `## Instructions\n` +
          `\n` +
          primaryInstructions +
          `\n` +
          `The main types of improvements or fixes to look for:\n` +
          `- Any major ambiguities that can't easily be inferred?\n` +
          `- Any extensions that are needed or recommended?\n` +
          `- Any external libraries that are needed or recommended?\n` +
          `- Any logical errors can you identify?\n` +
          `- Which new files would be helpful? Especially for defining ` +
          `  types that could be imported by multiple files.\n` +
          `- Any incorrect or missing imports are priority 1.\n` +
          `\n` +
          `Don't raise suggestions for things that don't need to be ` +
          `changed, don't mention them even partially.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          `## Fields\n` +
          `\n` +
          `- The content is optional where IntentCode can be specified for ` +
          `  a file. Whether existing or modified.\n` +
          `- Suggestion priorities are from 1 (urgent) to 5 (low).\n` +
          `- The fileOp can be: ` + JSON.stringify(FileOps) + `\n` +
          `- The change per fileDelta is a brief description of the change ` +
          `  and not the new contents to set.\n`

    if (promptType === AnalyzerPromptTypes.chatAboutSuggestion) {

      prompt +=
        `- The messages are were you put your reply to the user.\n` +
        `- If the generated suggestion is unchanged, then don't set the ` +
        `  suggestion field in the output.\n`
    }

    // New-line after fields
    prompt += `\n`

    /* Continue the prompt
    prompt +=
      depsPrompting +
      `\n` */

    // Existing suggestion?
    if (suggestion != null) {

      prompt +=
        `## Generated suggestion\n` +
        `\n` +
        `This chat concerns this generated suggestion:\n` +
        `\n` +
        JSON.stringify(suggestion) +
        `\n`
    }

    // Continue prompt
    prompt +=
      `## Example JSON output\n` +
      `\n` +
      `This is an example of the output structure only. Don't try to ` +
      `use it as a source of any kind of data.\n` +
      `\n`

    if (promptType === AnalyzerPromptTypes.createSuggestions) {

      prompt +=
        `{\n` +
        `  "suggestions": [\n` +
        `    {\n` +
        `      "priority": <priority>,\n` +
        `      "text": "<suggestion>",\n` +
        `      "projectNo": <projectNo>,\n` +
        `      "fileDeltas": [\n `+
        `        {\n` +
        `          "fileOp": "<fileOp>",\n` +
        `          "relativePath": "<targetFilename>.<srcExt>.md",\n` +
        `          "change": "<change>"\n` +
        `        }\n` +
        `      ]\n` +
        `    }\n` +
        `  ]\n` +
        `}\n` +
        `\n`

    } else if (promptType === AnalyzerPromptTypes.chatAboutSuggestion) {

      prompt +=
        `{\n` +
        `  "messages": [{\n` +
        `    "text": "<reply>\n"` +
        `  }],\n` +
        `  "suggestion": {\n` +
        `    "priority": <priority>,\n` +
        `    "text": "<suggestion>",\n` +
        `    "projectNo": <projectNo>,\n` +
        `    "fileDeltas": [\n `+
        `      {\n` +
        `        "fileOp": "<fileOp>",\n` +
        `        "relativePath": "<targetFilename>.<srcExt>.md",\n` +
        `        "change": "<change>"\n` +
        `      }\n` +
        `    ]\n` +
        `  }\n` +
        `}\n` +
        `\n`
    }

    // Add numbered projects
    if (buildData.projects != null) {

      prompt +=
        projectsQueryService.getProjectsPrompting(buildData.projects)
    }

    /* Add installed extensions
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
    } */

    // Add existing IntentCode files
    const intentCodePrompting = await
            intentCodePromptingService.getAllPrompting(buildData)

    if (intentCodePrompting != null) {
      prompt += intentCodePrompting
    }

    // Get skills used across files
    const skillsMap =
      compilerQueryService.getMultiFileSkillPrompting(
        buildData,
        buildFromFiles)

    // Target lang prompting
    for (const [targetFileExt, targetLangPrompting] of skillsMap.entries()) {

      prompt +=
        `## ${targetFileExt} specific\n` +
        targetLangPrompting +
        `\n`
    }

    // Return
    return prompt
  }
}
