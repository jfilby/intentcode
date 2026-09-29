import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord, SourceNodeWithRelations } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

/**
 * The path a node's jsonContent records, which is what the indexed data is
 * read back in. Undefined for a node that has none.
 */
function relativePathOf(node: SourceNodeRecord): string | undefined {

  const jsonContent = node.jsonContent

  if (jsonContent == null ||
      typeof jsonContent !== 'object' ||
      !('relativePath' in jsonContent) ||
      typeof jsonContent.relativePath !== 'string') {

    return undefined
  }

  return jsonContent.relativePath
}

// Class
export class IntentCodeGraphQueryService {

  // Consts
  clName = 'IntentCodeGraphQueryService'

  // Code
  async getAllIndexedData(
    store: ProjectStore,
    projectIntentCodeNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getAllIndexedData()`

    // Get indexed SourceNodes
    const indexedSourceNodes = await
      this.getIndexedNodes(
        store,
        projectIntentCodeNode)

    // Every indexed node has to say which Intent file it came from, so that a
    // node missing it is a failure rather than a node that sorts nowhere.
    const relativePaths = indexedSourceNodes.map(relativePathOf)

    for (const [index, relativePath] of relativePaths.entries()) {

      if (relativePath == null) {

        const indexedSourceNode = indexedSourceNodes[index]

        console.log(
          `${fnName}: sourceNode with id: ${indexedSourceNode.id} and ` +
          `jsonContent ` + JSON.stringify(indexedSourceNode.jsonContent))

        throw new IntentError({
          category: 'StorageError',
          stage: fnName,
          message: `${fnName}: sourceNode.jsonContent?.relativePath == null`,
          detail: `the indexed node ${indexedSourceNode.id} has no ` +
            `relativePath`
        })
      }
    }

    // Order by relativePath, as these nodes are new for each build they can't
    // be ordered by parentIds.
    indexedSourceNodes.sort((a, b) => {

      const aPath = relativePathOf(a) ?? ''
      const bPath = relativePathOf(b) ?? ''

      if (aPath < bPath) {
        return -1
      }

      if (aPath > bPath) {
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
    store: ProjectStore,
    projectIntentCodeNode: SourceNodeRecord) {

    // Var to return
    var indexedDataSourceNodes: SourceNodeWithRelations[] = []

    // Get all IntentCode nodes
    const intentCodeNodes = await
      sourceNodeModel.filter(
        store,
        projectIntentCodeNode.id,
        undefined,                       // projectId
        SourceNodeTypes.intentCodeFile)   // type

    // Get the indexed node of each IntentCodeNode
    for (const intentCodeNode of intentCodeNodes) {

      // Get indexed nodes (should only be one)
      const thisIndexedDataSourceNodes = await
        sourceNodeModel.filter(
          store,
          intentCodeNode.id,
          undefined,  // projectId
          SourceNodeTypes.intentCodeIndexedData)

      // Add parent field
      for (const thisIndexedDataSourceNode of thisIndexedDataSourceNodes) {
        thisIndexedDataSourceNode.parent = intentCodeNode
      }

      // Add to all nodes
      indexedDataSourceNodes =
        indexedDataSourceNodes.concat(thisIndexedDataSourceNodes)
    }

    // Return
    return indexedDataSourceNodes
  }

  async getIntentCodeDir(
    store: ProjectStore,
    projectId: string,
    parentNode: SourceNodeRecord,
    name: string) {

    // Debug
    const fnName = `${this.clName}.getIntentCodeDir()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectIntentCode,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    var intentCodeDir = await
      sourceNodeModel.getByUniqueKey(
        store,
        parentNode.id,
        projectId,
        SourceNodeTypes.intentCodeDir,
        name)

    // Return
    return intentCodeDir
  }

  async getIntentCodeProjectNode(
    store: ProjectStore,
    buildNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.getIntentCodeProjectNode()`

    // Validate
    if (buildNode.type !== SourceNodeTypes.build) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: projectNode.type !== SourceNodeTypes.project`
      })
    }

    // Get source node
    const sourceCodeProject = await
      sourceNodeModel.getByUniqueKey(
        store,
        buildNode.id,
        buildNode.projectId,
        SourceNodeTypes.projectIntentCode,
        SourceNodeNames.projectIntentCode)

    // Return
    return sourceCodeProject
  }
}
