import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeCommonTypes } from '../common/types'
import { FileDeltas, ServerOnlyTypes } from '@/types/server-only-types'
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
          projectNode: SourceNode,
          buildData: BuildData,
          buildFromFiles: BuildFromFile[]) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    /* Get deps prompting
    const depsPrompting = await
            dependenciesPromptService.getDepsPrompting(
              prisma,
              projectNode,
              buildFromFile.fileNode,
              buildFromFile.targetFullPath) */

    // Get skills used across files
    const skillsMap =
      compilerQueryService.getMultiFileSkillPrompting(
        buildData,
        buildFromFiles)

    // Debug
    // console.log(`${fnName}: targetLangPrompting: ${targetLangPrompting}`)

    // Start the prompt
    var prompt =
          `## Instructions\n` +
          `\n` +
          `You need to run a analysis on the IntentCode.\n` +
          `\n` +
          `The main types of improvements or fixes to look for:` +
          `- Any major ambiguities that can't easily be inferred?\n` +
          `- Any extensions that are needed or recommended?\n` +
          `- Any external libraries that are needed or recommended?\n` +
          `- Any logical errors can you identify?\n` +
          `- Which new files would be helpful? Especially for defining ` +
          `  shared types.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          `## Fields\n` +
          `\n` +
          `- The content is optional where IntentCode can be specified for ` +
          `  a file. Whether existing or modified.\n` +
          `- Suggestion priorities are from 1 (urgent) to 5 (low).\n` +
          `- The fileDelta can be: ` + JSON.stringify(FileDeltas) + `\n` +
          `\n` +
          // depsPrompting +
          `\n` +
          `## Example JSON output\n` +
          `\n` +
          `This is an example of the output structure only. Don't try to ` +
          `use it as a source of any kind of data.\n` +
          `\n` +
          `The top-level JSON is an array (of suggestions), with a list of ` +
          `file changes described in the fileDeltas array.\n` +
          `\n` +
          `{\n` +
          `  "suggestions": [\n` +
          `    {\n` +
          `      "priority": <priority>,\n` +
          `      "text": "<suggestion>",\n` +
          `      "projectNo": <projectNo>,\n` +
          `      "fileDeltas": [\n `+
          `        {\n` +
          `          "fileDelta": "<fileDelta>",\n` +
          `          "relativePath": "<targetFilename>.<srcExt>.md",\n` +
          `          "change": "<change>"\n` +
          `        }\n` +
          `      ]\n` +
          `    }\n` +
          `  ]\n` +
          `}\n` +
          `\n`

    // Add numbered projects
    if (buildData.projectsMap != null) {

      prompt +=
        projectsQueryService.getProjectsPrompting(
          buildData.projectsMap)
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
