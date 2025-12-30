import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { TechQueryService } from '@/serene-core-server/services/tech/tech-query-service'
import { UsersService } from '@/serene-core-server/services/users/service'
import { LlmEnvNames, ServerOnlyTypes } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { SourceNodeNames } from '@/types/source-graph-types'
import { CompilerMutateLlmService } from './llm-service'
import { FsUtilsService } from '@/services/utils/fs-utils-service'
import { GraphQueryService } from '@/services/graphs/intentcode/graph-query-service'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service'
import { IntentCodePathGraphMutateService } from '@/services/graphs/intentcode/path-graph-mutate-service'
import { SourceCodePathGraphMutateService } from '@/services/graphs/source-code/path-graph-mutate-service'

// Services
const compilerMutateLlmService = new CompilerMutateLlmService()
const fsUtilsService = new FsUtilsService()
const graphQueryService = new GraphQueryService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const intentCodePathGraphMutateService = new IntentCodePathGraphMutateService()
const sourceCodePathGraphMutateService = new SourceCodePathGraphMutateService()
const techQueryService = new TechQueryService()
const usersService = new UsersService()

// Class
export class CompilerMutateService {

  // Consts
  clName = 'CompilerMutateService'

  // Code
  getPrompt(
    targetLang: string,
    intentCode: string,
    indexedDataSourceNodes: SourceNode[]) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Start the prompt
    var prompt =
          `## Instructions\n` +
          `\n` +
          `You need to:\n` +
          `1. Determine the assumptions needed in the IntentCode to make it ` +
          `   unambiguous.\n` +
          `2. Scan for warnings and errors. If there are any errors then ` +
          `   don't return any target source.\n` +
          `3. Try to fix and errors and warnings in the fixedIntentCode ` +
          `   field.\n` +
          `4. Convert the input IntentCode (if no errors) to ${targetLang} ` +
          `   source code.\n` +
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
          `- Don assume without data: if you don't know something critical ` +
          `  then list it as an error.\n` +
          `\n` +
          `## Messages\n` +
          `\n` +
          `Warnings and errors might not have a line, from and to numbers, ` +
          `but they always have a text field.\n` +
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
          `}\n` +
          `\n` +
          `## IntentCode\n` +
          `\n` +
          intentCode +
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

        // Get intentCodeFileSourceNode
        const intentCodeFileSourceNode = (indexedDataSourceNode as any).parent

        prompt +=
          `- file: ${intentCodeFileSourceNode.jsonContent.relativePath}\n` +
          `  astTree: ${intentCodeFileSourceNode.jsonContent.astTree}\n\n`
      }
    } else {

      prompt += `None available.`
    }

    // Return
    return prompt
  }

  async processResults(
          prisma: PrismaClient,
          intentFileSourceNode: SourceNode,
          projectSourceNode: SourceNode,
          fileModifiedTime: Date,
          queryResults: any) {

    // Debug
    const fnName = `${this.clName}.run()`

    // Write source file (if any)
    if (queryResults.json.targetSource != null) {

      // Get paths
      const projectSourcePath = (projectSourceNode.jsonContent as any).path

      const intentFileRelativePath =
              (intentFileSourceNode.jsonContent as any).relativePath

      // Validate
      if (projectSourcePath == null) {
        throw new CustomError(`${fnName}: projectSourcePath == null`)
      }

      if (intentFileRelativePath == null) {
        throw new CustomError(`${fnName}: intentFileRelativePath == null`)
      }

      if (!intentFileRelativePath.endsWith(ServerOnlyTypes.dotMdFileExt)) {

        throw new CustomError(
          `${fnName}: intentFileRelativePath doesn't end with ` +
          `${ServerOnlyTypes.dotMdFileExt}`)
      }

      // Get SourceCode relative path
      const sourceFileRelativePath =
              intentFileRelativePath.slice(
                0,
                intentFileRelativePath.length - ServerOnlyTypes.dotMdFileExt.length)

      const fullPath = projectSourcePath + sourceFileRelativePath

      // Get/create SourceCode node path
      await sourceCodePathGraphMutateService.getOrCreateSourceCodePathAsGraph(
              prisma,
              projectSourceNode,
              fullPath,
              queryResults.json.targetSource)

      // Write source file
      await fsUtilsService.writeTextFile(
              fullPath,
              queryResults.json.targetSource,
              true)  // createMissingDirs
    }

    // Upsert the compiler data node
    const compilerDataSourceNode = await
            intentCodeGraphMutateService.upsertIntentCodeCompilerData(
              prisma,
              intentFileSourceNode.instanceId,
              intentFileSourceNode,  // parentNode
              SourceNodeNames.compilerData,
              queryResults.json,     // jsonContent
              fileModifiedTime)
  }

  async run(prisma: PrismaClient,
            intentCodeProjectNode: SourceNode,
            projectSourceNode: SourceNode,
            fullPath: string,
            fileModifiedTime: Date,
            targetLang: string,
            intentCode: string) {

    // Debug
    const fnName = `${this.clName}.run()`

    // console.log(`${fnName}: starting..`)

    // Get all related indexed data, including for this file
    const indexedDataSourceNodes = await
            graphQueryService.getAllIndexedData(
              prisma,
              intentCodeProjectNode.instanceId)

    if (indexedDataSourceNodes.length === 0) {
      throw new CustomError(`${fnName}: indexedDataSourceNodes.length === 0`)
    }

    // Get/create the file's SourceNode
    const intentFileSourceNode = await
            intentCodePathGraphMutateService.getOrCreateIntentCodePathAsGraph(
              prisma,
              intentCodeProjectNode,
              fullPath)

    /* Check if the file has been updated since last indexed
    if (intentFileSourceNode?.contentUpdated != null &&
        intentFileSourceNode.contentUpdated <= fileModifiedTime) {

      // console.log(`${fnName}: file: ${fullPath} already indexed`)
      return
    } */

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
              LlmEnvNames.compilerEnvName)

    // Get prompt
    const prompt =
      this.getPrompt(
        targetLang,
        intentCode,
        indexedDataSourceNodes)

    // Run
    const llmResults = await
            compilerMutateLlmService.llmRequest(
              prisma,
              adminUserProfile.id,
              tech,
              prompt)

    // Process results
    await this.processResults(
            prisma,
            intentFileSourceNode,
            projectSourceNode,
            fileModifiedTime,
            llmResults.queryResults)

    // Return
    return llmResults
  }
}
