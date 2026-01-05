import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { DepDelta, DepDeltaNames } from '@/types/server-only-types'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceEdgeModel } from '@/models/source-graph/source-edge-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceEdgeModel = new SourceEdgeModel()
const sourceNodeModel = new SourceNodeModel()

// Class
export class DependenciesMutateService {

  // Consts
  clName = 'DependenciesMutateService'

  // Code
  async delDep(
          prisma: PrismaClient,
          depsNode: SourceNode,
          intentFileNode: SourceNode,
          name: string) {

    // Try to get by unique key
    const depEdge = await
            sourceEdgeModel.getByUniqueKey(
              prisma,
              intentFileNode.id,
              depsNode.id,
              name)

    if (depEdge == null) {
      return
    }

    // Delete edge
    await sourceEdgeModel.deleteById(
            prisma,
            depEdge.id)
  }

  async getOrCreateDepsNode(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Try to get an existing node
    var depsNode = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            intentCodeProjectNode.id,
            intentCodeProjectNode.instanceId,
            SourceNodeTypes.deps,
            SourceNodeNames.depsName)

    if (depsNode != null) {
      return depsNode
    }

    depsNode = await
      sourceNodeModel.create(
        prisma,
        intentCodeProjectNode.id,  // parentId
        intentCodeProjectNode.instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.deps,
        SourceNodeNames.depsName,
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return depsNode
  }

  async processDeps(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode,
          intentFileNode: SourceNode,
          deps: DepDelta[]) {

    // Debug
    const fnName = `${this.clName}.processDeps()`

    // Validate
    if (deps == null) {
      return
    }

    if (intentFileNode == null) {
      throw new CustomError(`${fnName}: intentFileNode == null`)
    }

    // Prepare intentFileNode
    if (intentFileNode.jsonContent == null) {
      intentFileNode.jsonContent = {}
    }

    // Update jsonContent
    (intentFileNode.jsonContent as any).deps = deps

    // Get jsonContentHash
    intentFileNode.jsonContentHash = blake3(JSON.stringify(prompt)).toString()

    // Upsert IntentFileNode
    intentFileNode = await
      sourceNodeModel.setJsonContent(
        prisma,
        intentFileNode.id,
        intentFileNode.jsonContent,
        intentFileNode.jsonContentHash)

    // Get/create deps node
    const depsNode = await
            this.getOrCreateDepsNode(
              prisma,
              intentCodeProjectNode)

    // Create edges to dependencies file
    for (const dep of deps) {

      if (dep.delta === DepDeltaNames.set) {

        await this.setDep(
                prisma,
                depsNode,
                intentFileNode,
                dep.name)

      } else if (dep.delta === DepDeltaNames.del) {

        await this.delDep(
                prisma,
                depsNode,
                intentFileNode,
                dep.name)
      }
    }
  }

  async setDep(
          prisma: PrismaClient,
          depsNode: SourceNode,
          intentFileNode: SourceNode,
          name: string) {

    // Upsert edge
    const depEdge = await
            sourceEdgeModel.upsert(
              prisma,
              undefined,  // id
              intentFileNode.id,
              depsNode.id,
              BaseDataTypes.activeStatus,
              name)
  }
}
