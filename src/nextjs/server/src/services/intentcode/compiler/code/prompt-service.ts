import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildFromFile } from '@/types/build-types'
import { ExtensionsData } from '@/types/source-graph-types'
import { IntentCodeCommonTypes } from '../../common/types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { CompilerQueryService } from './query-service'
import { DependenciesPromptService } from '@/services/graphs/dependencies/prompt-service'
import { SourceAssistIntentCodeService } from '../../source/source-prompt'

// Services
const compilerQueryService = new CompilerQueryService()
const dependenciesPromptService = new DependenciesPromptService()
const sourceAssistIntentCodeService = new SourceAssistIntentCodeService()

// Class
export class CompilerPromptService {

  // Consts
  clName = 'CompilerPromptService'

  // Code
  async getPrompt(
          prisma: PrismaClient,
          projectNode: SourceNode,
          projectSourceCodeNode: SourceNode,
          buildFromFile: BuildFromFile,
          extensionsData: ExtensionsData,
          indexedDataSourceNodes: SourceNode[]) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

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

    // Return
    return prompt
  }

  async addExistingSource(
          projectSourceCodeNode: SourceNode,
          buildFromFile: BuildFromFile,
          prompt: string) {

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
}
