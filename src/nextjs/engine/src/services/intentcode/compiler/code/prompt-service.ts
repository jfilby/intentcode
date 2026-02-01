import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData, BuildFromFile } from '@/types/build-types'
import { ExtensionsData } from '@/types/source-graph-types'
import { IntentCodeCommonTypes } from '../../common/types'
import { CompilerMetaDataApproachs, ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types'
import { CompilerQueryService } from './query-service'
import { DependenciesPromptService } from '@/services/graphs/dependencies/prompt-service'
import { IntentCodeGraphQueryService } from '@/services/graphs/intentcode/graph-query-service'
import { IntentCodePromptingService } from '../../build/prompting-service'
import { SourceAssistIntentCodeService } from '../../source/source-prompt'

// Services
const compilerQueryService = new CompilerQueryService()
const dependenciesPromptService = new DependenciesPromptService()
const intentCodeGraphQueryService = new IntentCodeGraphQueryService()
const intentCodePromptingService = new IntentCodePromptingService()
const sourceAssistIntentCodeService = new SourceAssistIntentCodeService()

// Class
export class CompilerPromptService {

  // Consts
  clName = 'CompilerPromptService'

  // Code
  async getPrompt(
    prisma: PrismaClient,
    buildData: BuildData,
    buildFromFile: BuildFromFile,
    projectNode: SourceNode,
    projectDetails: ProjectDetails,
    extensionsData: ExtensionsData) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Get deps prompting
    const depsPrompting = await
            dependenciesPromptService.getDepsPrompting(
              prisma,
              projectNode,
              buildFromFile.fileNode,
              buildFromFile.targetFullPath)

    // Get skills by targetLang
    const targetLangPrompting =
            compilerQueryService.getSkillPrompting(
              extensionsData,
              buildFromFile.targetFileExt)

    // Debug
    // console.log(`${fnName}: targetLangPrompting: ${targetLangPrompting}`)

    // Start the prompt
    var prompt =
          `## Instructions\n` +
          `\n` +
          `You need to:\n` +
          `- Determine the assumptions needed in the IntentCode to make it ` +
          `  unambiguous.\n` +
          `- Scan for warnings and errors, but not in the existing source. ` +
          `  If there are any errors in the new source then don't return ` +
          `  any target source.\n` +
          `- Try to fix and errors and warnings in the fixedIntentCode ` +
          `  field.\n` +
          `- Convert the input IntentCode (if no errors) to ` +
          `  ${buildFromFile.targetFileExt} source code.\n` +
          `- Use the indexed data for this file as a structural starting ` +
          `  point. Imports depend on this to be accurate.\n` +
          `- Write idiomatic code, this is for actual use.\n` +
          `- Use the available index data to determine the names of classes ` +
          `  and other named entities in other files.\n` +
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
          `## Example JSON output\n` +
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
      `\n`

    // Indexer data?
    if (ServerOnlyTypes.compilerMetaDataApproach === CompilerMetaDataApproachs.indexer) {

      prompt += await
        this.addIndexerPrompting(
          prisma,
          projectDetails)

    } else if (ServerOnlyTypes.compilerMetaDataApproach === CompilerMetaDataApproachs.analyzer) {

      // Add existing IntentCode files
      const intentCodePrompting = await
              intentCodePromptingService.getAllPrompting(buildData)

      if (intentCodePrompting != null) {
        prompt += intentCodePrompting
      }

    } else {
      throw new CustomError(`${fnName}: invalid compilerMetaDataApproach`)
    }

    // Get prompt without source
    const promptWithoutSource = prompt

    // Get the existing source
    const sourcePrompting = await
      this.addExistingSource(
        projectDetails.projectSourceNode,
        buildFromFile)

    prompt += sourcePrompting

    // Return
    return { promptWithoutSource, prompt }
  }

  async addExistingSource(
    projectSourceNode: SourceNode,
    buildFromFile: BuildFromFile) {

    // Existing source code
    var prompting = ''

    if (ServerOnlyTypes.includeExistingSourceMode === true) {

      const existingSourcePrompting = await
              sourceAssistIntentCodeService.getExistingSourcePrompting(
                projectSourceNode,
                buildFromFile)

      if (existingSourcePrompting != null) {
        prompting += existingSourcePrompting
      }
    }

    // Return
    return prompting
  }

  async addIndexerPrompting(
    prisma: PrismaClient,
    projectDetails: ProjectDetails) {

    // Debug
    const fnName = `${this.clName}.addIndexerPrompting()`

    // Get all related indexed data, including for this file
    const indexedDataSourceNodes = await
      intentCodeGraphQueryService.getAllIndexedData(
        prisma,
        projectDetails.projectIntentCodeNode)

    if (indexedDataSourceNodes.length === 0) {
      throw new CustomError(`${fnName}: indexedDataSourceNodes.length === 0`)
    }

    // Initial prompting
    var prompting =
      `## Index data\n` +
      `\n` +
      `Indexed data has been generated for each target file, based on ` +
      `IntentCode. This is to provide assistance when generating source.\n` +
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

        prompting +=
          `### File: ${relativePath}\n` +
          `\n` +
          `${astTree}\n\n`
      }
    } else {
      prompting += `None available.`
    }

    // Return
    return prompting
  }
}
