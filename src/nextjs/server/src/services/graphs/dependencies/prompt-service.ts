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
          intentCodeProjectNode: SourceNode,
          intentFileNode: SourceNode) {

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
      `\n`

    if ((intentFileNode.jsonContent as any).deps != null) {

      const deps = (intentFileNode.jsonContent as any).deps

      prompting += `Existing deps for this file:\n`

      for (const [depName, depDetails] of
           Object.entries((intentFileNode.jsonContent as any).deps)) {

        prompting +=
          `- ${depName}: minVersion: ${(depDetails as any).minVersion}\n`
      }

      prompting += `\n`
    }

    // Full list of deps for this project
    const projectDepsPrompting = await
            this.getProjectDepsPrompting(
              prisma,
              intentCodeProjectNode)

    if (projectDepsPrompting != null) {

      prompting += projectDepsPrompting
    }

    // Return
    return prompting
  }

  async getProjectDepsPrompting(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getProjectDepsPrompting()`

    // Try to get deps node
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              prisma,
              intentCodeProjectNode)

    if (depsNode?.jsonContent?.deps == null) {
      return
    }

    // Process the consolidated list as prompting
    var prompting = `Full list of dependencies in this project:\n`

    for (const [depName, depDetails] of
         Object.entries(depsNode.jsonContent.deps)) {

      prompting +=
        `- ${depName}: minVersion: ${(depDetails as any).minVersion}\n`
    }

    // Return
    return prompting
  }
}
