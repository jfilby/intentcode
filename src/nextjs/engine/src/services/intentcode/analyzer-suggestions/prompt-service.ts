import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { IntentCodeCommonTypes } from '../common/types'
import { FileOps, ServerOnlyTypes } from '@/types/server-only-types'
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
export class IntentCodeAnalyzerSuggestionsPromptService {

  // Consts
  clName = 'IntentCodeAnalyzerSuggestionsPromptService'

  // Code
  async getPrompt(
          prisma: PrismaClient,
          buildData: BuildData,
          buildFromFiles: BuildFromFile[],
          suggestions: any[]) {

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
          `Apply the suggested change to the IntentCode.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          `## Fields\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodeFileDeltasPrompting +
          `\n` +
          // depsPrompting +
          `\n` +
          `## Changes to apply\n` +
          `\n` +
          JSON.stringify(suggestions) +
          `\n` +
          `## Example JSON output\n` +
          `\n` +
          `This is an example of the output structure only. Don't try to ` +
          `use it as a source of any kind of data.\n` +
          `\n` +
          `{\n` +
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
