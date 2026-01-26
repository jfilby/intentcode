import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ProjectDetails } from '@/types/server-only-types'
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
    projectIntentCodeNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.getAllIndexedData()`

    // Get indexed SourceNodes
    const indexedSourceNodes = await
      this.getIndexedNodes(
        prisma,
        projectIntentCodeNode)

    // Validate
    for (const indexedSourceNode of indexedSourceNodes) {

      if ((indexedSourceNode.jsonContent as any)?.relativePath == null) {

        console.log(
          `${fnName}: sourceNode with id: ${indexedSourceNode.id} and ` +
          `jsonContent ` + JSON.stringify(indexedSourceNode.jsonContent))

        throw new CustomError(
          `${fnName}: sourceNode.jsonContent?.relativePath == null`)
      }
    }

    // Order by relativePath, as these nodes are new for each build they can't
    // be ordered by parentIds.
    indexedSourceNodes.sort((a, b) => {

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
    // console.log(`${fnName}: indexedSourceNodes: ` +
    //   JSON.stringify(indexedSourceNodes))

    // Return
    return indexedSourceNodes
  }

  async getIndexedNodes(
    prisma: PrismaClient,
    projectIntentCodeNode: SourceNode) {

    // Var to return
    var indexedDataSourceNodes: SourceNode[] = []

    // Get all IntentCode nodes
    const intentCodeNodes = await
      sourceNodeModel.filter(
        prisma,
        projectIntentCodeNode.id,
        undefined,                       // instanceId
        SourceNodeTypes.intentCodeFile)  // type

    // Get the indexed node of each IntentCodeNode
    for (const intentCodeNode of intentCodeNodes) {

      // Get indexed nodes (should only be one)
      const thisIndexedDataSourceNodes = await
        sourceNodeModel.filter(
          prisma,
          intentCodeNode.id,
          undefined,  // instanceId
          SourceNodeTypes.intentCodeIndexedData)

      // Add parent field
      for (const thisIndexedDataSourceNode of thisIndexedDataSourceNodes) {
        (thisIndexedDataSourceNode as any).parent = intentCodeNode
      }

      // Add to all nodes
      indexedDataSourceNodes =
        indexedDataSourceNodes.concat(thisIndexedDataSourceNodes)
    }

    // Return
    return indexedDataSourceNodes
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
