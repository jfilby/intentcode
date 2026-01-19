import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { DepDelta, DepDeltaNames } from '@/types/server-only-types'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceEdgeModel } from '@/models/source-graph/source-edge-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesQueryService } from './query-service'
import { DepsJsonService } from '@/services/managed-files/deps/deps-json-service'

// Models
const sourceEdgeModel = new SourceEdgeModel()
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesQueryService = new DependenciesQueryService()
const depsJsonService = new DepsJsonService()

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
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getOrCreateDepsNode()`

    // Validate
    if (projectNode.type !== SourceNodeTypes.project) {

      throw new CustomError(
        `${fnName}: projectNode.type !== SourceNodeTypes.project`)
    }

    // Try to get the existing node
    var depsNode = await
          dependenciesQueryService.getDepsNode(
            prisma,
            projectNode)

    if (depsNode != null) {
      return depsNode
    }

    depsNode = await
      sourceNodeModel.create(
        prisma,
        projectNode.id,  // parentId
        projectNode.instanceId,
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
          projectNode: SourceNode,
          intentFileNode: SourceNode,
          depDeltas: DepDelta[]) {

    // Debug
    const fnName = `${this.clName}.processDeps()`

    // Validate
    if (depDeltas == null) {
      return
    }

    if (intentFileNode == null) {
      throw new CustomError(`${fnName}: intentFileNode == null`)
    }

    // Get/create deps node
    const depsNode = await
            this.getOrCreateDepsNode(
              prisma,
              projectNode)

    // Update jsonContent of intentFileNode
    await this.updateNodeDepDeltas(
            prisma,
            intentFileNode,
            depDeltas)

    // Update jsonContent of depsNode
    await this.updateNodeDepDeltas(
            prisma,
            depsNode,
            depDeltas)

    // Update each dep
    for (const depDelta of depDeltas) {

      if (depDelta.delta === DepDeltaNames.set) {

        await this.setDep(
                prisma,
                depsNode,
                intentFileNode,
                depDelta.name)

      } else if (depDelta.delta === DepDeltaNames.del) {

        await this.delDep(
                prisma,
                depsNode,
                intentFileNode,
                depDelta.name)
      }
    }

    // Write the updated deps.json file
    await depsJsonService.writeToFile(
            prisma,
            projectNode,
            depsNode)
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

  async updateDepsNode(
          prisma: PrismaClient,
          depsNode: SourceNode) {

    // Get contentHash
    depsNode.contentHash = null

    if (depsNode.content != null) {

      depsNode.contentHash =
        blake3(JSON.stringify(depsNode.content)).toString()
    }

    // Get jsonContentHash
    depsNode.jsonContentHash = null

    if (depsNode.jsonContent != null) {

      depsNode.jsonContentHash =
        blake3(JSON.stringify(depsNode.jsonContent)).toString()
    }

    // Update
    depsNode = await
      sourceNodeModel.update(
        prisma,
        depsNode.id,
        depsNode.parentId,
        depsNode.instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.deps,
        SourceNodeNames.depsName,
        depsNode.content,
        depsNode.contentHash,
        depsNode.jsonContent,
        depsNode.jsonContentHash,
        depsNode.contentUpdated)
  }

  async updateNodeDepDeltas(
          prisma: PrismaClient,
          node: SourceNode,
          depDeltas: DepDelta[]) {

    // Update jsonContent as depsJson
    var depsJson: any = structuredClone(node.jsonContent)

    if (depsJson == null) {
      depsJson = {}
    }

    if (depsJson.source == null) {
      depsJson.source = {}
    }

    if (depsJson.source.deps == null) {
      depsJson.source.deps = {}
    }

    // Process each delta
    for (const depDelta of depDeltas) {

      // Don't remove deps for the project's deps node
      if (node.type !== SourceNodeTypes.deps &&
          depDelta.delta === DepDeltaNames.del) {

        depsJson.source.deps[depDelta.name] = undefined
      }

      // Set deps
      if (depDelta.delta === DepDeltaNames.set) {

        depsJson.source.deps[depDelta.name] = depDelta.minVersion
      }
    }

    // Get depsJsonHash
    const depsJsonHash = blake3(JSON.stringify(depsJson)).toString()

    // Upsert IntentFileNode
    node = await
      sourceNodeModel.setJsonContent(
        prisma,
        node.id,
        depsJson,
        depsJsonHash)
  }
}
