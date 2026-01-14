import { PrismaClient, SourceNode } from "@prisma/client"
import { CustomError } from "@/serene-core-server/types/errors"
import { DepDeltaNames } from "@/types/server-only-types"
import { SourceNodeNames, SourceNodeTypes } from "@/types/source-graph-types"
import { SourceNodeModel } from "@/models/source-graph/source-node-model"

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class DependenciesQueryService {

  // Consts
  clName = 'DependenciesQueryService'

  // Code
  async getDepsNode(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getDepsNode()`

    // Validate
    if (projectNode.type !== SourceNodeTypes.project) {

      throw new CustomError(
        `${fnName}: projectNode.type !== SourceNodeTypes.project`)
    }

    // Try to get an existing node
    var depsNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,
            projectNode.instanceId,
            SourceNodeTypes.deps,
            SourceNodeNames.depsName)

    // Return depsNode
    return depsNode
  }

  verifyDepsDeltas(deps: any[]) {

    // Verify array
    if (!Array.isArray(deps)) {
      console.log(`deps isn't an array`)
      return false
    }

    // Verify each entry
    for (const dep of deps) {

      if (dep.delta == null) {
        console.log(`dep.delta not specified`)
        return false
      }

      if (![DepDeltaNames.del,
            DepDeltaNames.set].includes(dep.delta)) {

        console.log(`dep.delta not valid`)
        return false
      }

      if (dep.name == null) {
        console.log(`dep.name not specified`)
        return false
      }

      if (dep.minVersion == null) {
        console.log(`dep.minVersion not specified`)
        return false
      }
    }

    // Verified OK
    return true
  }
}
