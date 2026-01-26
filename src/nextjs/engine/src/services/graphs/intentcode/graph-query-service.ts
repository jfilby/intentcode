import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
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
              false)

    // Validate
    for (const sourceNode of sourceNodes) {

      if ((sourceNode.jsonContent as any)?.path == null) {
        throw new CustomError(
          `${fnName}: sourceNode.jsonContent?.path == null`)
      }
    }

    // Order by relativePath, as these nodes are new for each build they can't
    // be ordered by parentIds.
    sourceNodes.sort((a, b) => {

      if ((a.jsonContent as any).relativePath <
          (b.jsonContent as any).relativePath) {
        return -1
      }

      if ((a.jsonContent as any).relativePath >
          (b.jsonContent as any).relativePath) {
        return 1
      }

      return 0
    })

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

  async getIntentCodeProjectNode(
          prisma: PrismaClient,
          buildNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getIntentCodeProjectNode()`

    // Validate
    if (buildNode.type !== SourceNodeTypes.build) {

      throw new CustomError(
        `${fnName}: projectNode.type !== SourceNodeTypes.project`)
    }

    // Get source node
    const sourceCodeProject = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              buildNode.id,
              buildNode.instanceId,
              SourceNodeTypes.projectIntentCode,
              SourceNodeNames.projectIntentCode)

    // Return
    return sourceCodeProject
  }
}
