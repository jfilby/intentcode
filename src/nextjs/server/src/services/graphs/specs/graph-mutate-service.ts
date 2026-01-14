import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceNodeNames, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class SpecsGraphMutateService {

  // Consts
  clName = 'SpecsGraphMutateService'

  // Code
  async getOrCreateSpecsDir(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsDir()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.projectSpecs,
          SourceNodeTypes.specsDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: invalid type: ${parentNode.type}`)
    }

    // Try to get the node
    var specsDir = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.specsDir,
            name)

    if (specsDir != null) {
      return specsDir
    }

    // Create the node
    specsDir = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
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
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string,
          relativePath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsFile()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.projectSpecs,
          SourceNodeTypes.specsDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: invalid type: ${parentNode.type}`)
    }

    // Try to get the node
    var specsFile = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.specsFile,
            name)

    // console.log(`${fnName}: intentCodeFile: ` + JSON.stringify(intentCodeFile))

    if (specsFile != null) {
      return specsFile
    }

    // Create the node
    specsFile = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
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
          prisma: PrismaClient,
          projectNode: SourceNode,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateSpecsProject()`

    // Try to get the node
    var specsProject = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            projectNode.id,  // parentId
            projectNode.instanceId,
            SourceNodeTypes.projectSpecs,
            SourceNodeNames.projectSpecs)

    if (specsProject != null) {
      return specsProject
    }

    // Define jsonContent
    const jsonContent = {
      path: localPath
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    specsProject = await
      sourceNodeModel.create(
        prisma,
        projectNode.id,  // parentId
        projectNode.instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.projectSpecs,
        SourceNodeNames.projectSpecs,
        null,  // content
        null,  // contentHash
        jsonContent,
        jsonContentHash,
        null)  // contentUpdated

    // Return
    return specsProject
  }
}
