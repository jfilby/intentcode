import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceEdgeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceEdgeModel } from '@/models/source-graph/source-edge-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceEdgeModel = new SourceEdgeModel()
const sourceNodeModel = new SourceNodeModel()

// Class
export class GraphQueryService {

  // Consts
  clName = 'GraphQueryService'

  // Code
  async getAllIndexedData(
          prisma: PrismaClient,
          instanceId: string) {

    // Debug
    const fnName = `${this.clName}.getAllIndexedData()`

    // Get SourceNodes
    const sourceNodes = await
            sourceNodeModel.getJsonContentByInstanceIdAndType(
              prisma,
              instanceId,
              SourceNodeTypes.intentCodeIndexedData,
              true)  // includeParent

    // Debug
    // console.log(`${fnName}: sourceNodes: ` + JSON.stringify(sourceNodes))

    // Return
    return sourceNodes
  }

  async getProjectSourceNode(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getProjectSourceNode()`

    // Validate
    if (intentCodeProjectNode.type !== SourceNodeTypes.intentCodeProject) {

      throw new CustomError(`${fnName}: intentCodeProjectNode.type !== ` +
                            `SourceNodeTypes.intentCodeProject`)
    }

    // Get edge
    const sourceEdges = await
            sourceEdgeModel.filter(
              prisma,
              intentCodeProjectNode.id,  // fromId
              undefined,                 // toId
              BaseDataTypes.activeStatus,
              SourceEdgeNames.implements,
              false,  // includeFromNodes
              true)   // includeToNodes

    // Validate
    if (sourceEdges.length === 0) {
      throw new CustomError(`${fnName}: no project source link`)
    }

    if (sourceEdges.length > 0) {
      throw new CustomError(`${fnName}: more than one project source link`)
    }

    // Get the project source node
    return sourceEdges[0].to
  }
}
