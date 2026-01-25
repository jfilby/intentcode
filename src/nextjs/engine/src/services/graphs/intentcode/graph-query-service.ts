import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class IntentCodeGraphQueryService {

  // Consts
  clName = 'IntentCodeGraphQueryService'

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

  async getIntentCodeDir(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getIntentCodeDir()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.projectIntentCode,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: invalid type: ${parentNode.type}`)
    }

    // Try to get the node
    var intentCodeDir = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.intentCodeDir,
            name)

    // Return
    return intentCodeDir
  }
}
