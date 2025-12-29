import { PrismaClient } from '@prisma/client'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { SourceNodeTypes } from '@/types/source-graph-types'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class GraphQueryService {

  // Consts
  clName = 'GraphQueryService'

  // Code
  async getAllIndexedData(
          prisma: PrismaClient,
          instanceId: string) {

    const sourceNodes = await
            sourceNodeModel.getJsonContentByInstanceIdAndType(
              prisma,
              instanceId,
              SourceNodeTypes.intentCodeIndexedData,
              true)  // includeParent

    return sourceNodes
  }
}
