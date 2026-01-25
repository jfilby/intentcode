import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildFromFile } from '@/types/build-types'
import { IntentCodeCommonTypes } from '../common/types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionsData } from '@/types/source-graph-types'
import { CompilerQueryService } from '../compiler/code/query-service'
import { DependenciesPromptService } from '@/services/graphs/dependencies/prompt-service'

// Services
const compilerQueryService = new CompilerQueryService()
const dependenciesPromptService = new DependenciesPromptService()

// Class
export class IndexerPromptService {

  // Consts
  clName = 'IndexerPromptService'

  // Code
  async getPrompt(
          prisma: PrismaClient,
          projectNode: SourceNode,
          extensionsData: ExtensionsData,
          buildFromFile: BuildFromFile) {

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
              buildFromFile.fileNode)

    // Start the prompt
    var prompt = 
          `## Instructions\n` +  // for TypeScript dialect
          `\n` +
          `Identify the structures in the IntentCode:\n` +
          `- H1 headings are classes, unless they are meant to be run from ` +
          `  the CLI.\n` +
          `- H2 headings are functions.\n` +
          `\n` +
          `Make an all inclusive AST tree of every required type.\n` +
          `\n` +
          `Notes:\n` +
          `- You can infer parameters and the return type used in the ` +
          `  steps.\n` +
          // The `function call` attribute is needed to make the distinction
          // between calls and definitions to produce correct code.
          `- Function calls must include the "function call" attribute.\n` +
          `\n` +
          IntentCodeCommonTypes.intentCodePrompting +
          `\n` +
          depsPrompting +
          `\n` +
          `## Output field details\n` +  // TypeScript dialect
          `\n` +
          `The astNode can be:\n` +
          `- class\n` +
          `- type\n` +
          `- field (of type)\n` +
          `- function (of class or function)\n`+
          `- parameter (of function)\n` +
          `- type (of function's return, parameter or field)\n` +
          `\n` +
          ServerOnlyTypes.messagesPrompting +
          `\n` +
          `## Example JSON output\n` +  // Generic
          `\n` +
          `{\n` +
          `  "warnings": [],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "to": 7,\n` +
          `      "text": "Parameters specified without a function"\n` +
          `    }\n` +
          `  ],\n` +
          `  "astTree": [\n` +
          `    {\n` +
          `      "astNode": "class",\n` +
          `      "name": "..",\n` +
          `      "attributes": [".."],\n` +
          `      "children": [\n` +
          `        {\n` +
          `          "astNode": "function",\n` +
          `          "name": ".."\n,` +
          `          "type": ".."\n` +
          `        }\n` +
          `      ]\n` +
          `    }\n` +
          `  ],\n` +
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
      '```'

    // Return
    return prompt
  }
}
