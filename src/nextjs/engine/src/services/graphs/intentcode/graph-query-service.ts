import { PrismaClient } from '@prisma/client'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

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

    // Debug
    const fnName = `${this.clName}.getAllIndexedData()`

    // Get SourceNodes
    const sourceNodes = await
            sourceNodeModel.getJsonContentByInstanceIdAndType(
              prisma,
              instanceId,
              SourceNodeTypes.intentCodeIndexedData,
              true,  // includeParent
              true)  // orderByUniqueKey (for prompt reproducibility)

    // Debug
    // console.log(`${fnName}: sourceNodes: ` + JSON.stringify(sourceNodes))

    // Return
    return sourceNodes
  }
}
