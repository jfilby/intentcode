import { IntentError } from '@/core/errors.js'
import { blake3 } from '@noble/hashes/blake3'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class SpecsGraphMutateService {

  // Consts
  clName = 'SpecsGraphMutateService'

  // Code
  async getOrCreateSpecsDir(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsDir()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectSpecs,
          SourceNodeTypes.specsDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    let specsDir = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            SourceNodeTypes.specsDir,
            name)

    if (specsDir != null) {
      return specsDir
    }

    // Create the node
    specsDir = await
      sourceNodeModel.create(
        store,
        parentNode.id,  // parentId
        projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.specsDir,
        name,
        null,           // content
        null,           // contentHash
        null,           // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return specsDir
  }

  async getOrCreateSpecsFile(
          store: ProjectStore,
          projectId: string,
          parentNode: SourceNodeRecord,
          name: string,
          relativePath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsFile()`

    // Validate
    if (parentNode == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: parentNode == null`
      })
    }

    if (![SourceNodeTypes.projectSpecs,
          SourceNodeTypes.specsDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `${fnName}: invalid type: ${parentNode.type}`
      })
    }

    // Try to get the node
    let specsFile = await
          sourceNodeModel.getByUniqueKey(
            store,
            parentNode.id,
            projectId,
            SourceNodeTypes.specsFile,
            name)

    // console.log(`${fnName}: intentCodeFile: ` + JSON.stringify(intentCodeFile))

    if (specsFile != null) {
      return specsFile
    }

    // Create the node
    specsFile = await
      sourceNodeModel.create(
        store,
        parentNode.id,  // parentId
        projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.specsFile,
        name,
        null,           // content
        null,           // contentHash
        {
          relativePath: relativePath
        },              // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return specsFile
  }

  async getOrCreateSpecsProject(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          localPath: string) {

    // Try to get the node
    let specsProjectNode = await
          sourceNodeModel.getByUniqueKey(
            store,
            projectNode.id,  // parentId
            projectNode.projectId,
            SourceNodeTypes.projectSpecs,
            SourceNodeNames.projectSpecs)

    if (specsProjectNode != null) {
      return specsProjectNode
    }

    // Define jsonContent
    const jsonContent = {
      path: localPath
    }

    // Get jsonContentHash
    let jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    specsProjectNode = await
      sourceNodeModel.create(
        store,
        projectNode.id,  // parentId
        projectNode.projectId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.projectSpecs,
        SourceNodeNames.projectSpecs,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

    // Return
    return specsProjectNode
  }
}
