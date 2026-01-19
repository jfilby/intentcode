import { PrismaClient, SourceNode } from '@prisma/client'
import { DependenciesQueryService } from './query-service'
import { DepDeltaNames } from '@/types/server-only-types'

// Services
const dependenciesQueryService = new DependenciesQueryService()

// Class
export class DependenciesPromptService {

  // Consts
  clName = 'DependenciesPromptService'

  // Code
  async getDepsPrompting(
          prisma: PrismaClient,
          projectIntentCodeNode: SourceNode,
          intentFileNode: SourceNode,
          sourceFileRelativePath?: string) {

    // Debug
    const fnName = `${this.clName}.getDepsPrompting()`

    // Try to get deps node
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              prisma,
              projectIntentCodeNode)

    // Get jsonContent
    const depsJsonContent = (depsNode?.jsonContent)

    // Start prompting
    var prompting =
      `## Dependencies\n` +
      `\n` +
      `- Add or remove any dependencies using the deps field, but only ` +
      `  after considering existing dependencies.\n` +
      `- Any dependencies added in source output not in the existing list ` +
      `  should be set in the delta list.\n` +
      `- Field delta can be either ${DepDeltaNames.set} or ` +
      `  ${DepDeltaNames.del}.\n` +
      `- Prefer a major version only, e.g. "^5" instead of "^5.1.4".\n` +
      `\n`

    // Get related runtime info (if any)
    if (sourceFileRelativePath != null) {

      const runtimePrompting =
              this.getRuntimePrompting(
                depsJsonContent,
                sourceFileRelativePath)

      if (runtimePrompting != null) {
        prompting += runtimePrompting
      }
    }

    // Existing deps
    if ((intentFileNode.jsonContent as any).source?.deps != null) {

      prompting += `Existing deps for this file:\n`

      for (const [dependency, minVersion] of
           Object.entries((intentFileNode.jsonContent as any).source.deps)) {

        prompting +=
          `- ${dependency}: minVersion: ${minVersion}\n`
      }

      prompting += `\n`
    }

    // Full list of deps for this project
    const projectDepsPrompting =
            this.getProjectDepsPrompting(
              depsJsonContent,
              projectIntentCodeNode)

    if (projectDepsPrompting != null) {

      prompting += projectDepsPrompting
    }

    // Return
    return prompting
  }

  getProjectDepsPrompting(
    depsJsonContent: any,
    projectIntentCodeNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getProjectDepsPrompting()`

    // Validate
    if (depsJsonContent?.source?.deps == null) {
      return
    }

    // Process the consolidated list as prompting
    var prompting = `Full list of dependencies in this project:\n`

    for (const [depName, depDetails] of
         Object.entries(depsJsonContent.source.deps)) {

      prompting +=
        `- ${depName}: minVersion: ${(depDetails as any).minVersion}\n`
    }

    // Return
    return prompting
  }

  getRuntimePrompting(
    depsJsonContent: any,
    sourceFileRelativePath: string) {

    // Debug
    const fnName = `${this.clName}.getRuntimePrompting()`

    console.log(`${fnName}: depsJsonContent: ` +
                JSON.stringify(depsJsonContent))

    // Validate
    if (depsJsonContent?.source?.runtimes == null) {
      return null
    }

    // Iterate runtimes
    var prompting = ``

    for (const [runtime, obj] of Object.entries(depsJsonContent?.source?.runtimes)) {

      // Strip any leading dot from the run filename
      var runCheck = (obj as any).run as string

      if (runCheck.startsWith('.')) {
        runCheck = runCheck.slice(1)
      }

      // Debug
      // console.log(`${fnName}: check if ${sourceFileRelativePath} ends ` +
      //             `with ${runCheck}`)

      // Check
      if (sourceFileRelativePath.endsWith(runCheck)) {

        prompting +=
          `- The target source file needs to be runnable by ${runtime}.\n`
      }
    }

    // Return
    return prompting
  }
}
