import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceEdgeTypes, SourceNodeTypes } from '@/types/source-graph-types'
import { SourceEdgeModel } from '@/models/source-graph/source-edge-model'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'

// Models
const sourceEdgeModel = new SourceEdgeModel()
const sourceNodeModel = new SourceNodeModel()

// Code
export class IntentCodeGraphMutateService {

  // Consts
  clName = 'IntentCodeGraphMutateService'

  // Code
  async upsertIntentCodeCompilerData(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodeCompilerData()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    if (parentNode.type !== SourceNodeTypes.intentCodeFile) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeFile`)
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    const intentCodeCompilerData = await
            sourceNodeModel.upsert(
              prisma,
              undefined,      // id
              parentNode.id,  // parentId
              instanceId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.intentCodeCompilerData,
              null,           // path
              name,
              null,           // content
              null,           // contentHash
              jsonContent,
              jsonContentHash,
              new Date())     // contentUpdated

    // Return
    return intentCodeCompilerData
  }

  async getOrCreateIntentCodeDir(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeDir()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    if (![SourceNodeTypes.intentCodeProject,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeProject`)
    }

    // Try to get the node
    var intentCodeDir = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.intentCodeDir,
            name)

    if (intentCodeDir != null) {
      return intentCodeDir
    }

    // Create the node
    intentCodeDir = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.intentCodeDir,
        null,           // path
        name,
        null,           // content
        null,           // contentHash
        null,           // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return intentCodeDir
  }

  async getOrCreateIntentCodeFile(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeFile()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: parentNode == null`)
    }

    if (![SourceNodeTypes.intentCodeProject,
          SourceNodeTypes.intentCodeDir].includes(
            parentNode.type as SourceNodeTypes)) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeProject`)
    }

    // Try to get the node
    var intentCodeFile = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            parentNode.id,
            instanceId,
            SourceNodeTypes.intentCodeFile,
            name)

    console.log(`${fnName}: intentCodeFile: ` + JSON.stringify(intentCodeFile))

    if (intentCodeFile != null) {
      return intentCodeFile
    }

    // Create the node
    intentCodeFile = await
      sourceNodeModel.create(
        prisma,
        parentNode.id,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.intentCodeFile,
        null,           // path
        name,
        null,           // content
        null,           // contentHash
        null,           // jsonContent
        null,           // jsonContentHash
        null)           // contentUpdated

    // Return
    return intentCodeFile
  }

  async upsertIntentCodeIndexedData(
          prisma: PrismaClient,
          instanceId: string,
          parentNode: SourceNode,
          name: string,
          jsonContent: any) {

    // Debug
    const fnName = `${this.clName}.upsertIntentCodeIndexedData()`

    // Validate
    if (parentNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    if (parentNode.type !== SourceNodeTypes.intentCodeFile) {

      throw new CustomError(`${fnName}: parentNode.type !== ` +
                            `SourceNodeTypes.intentCodeFile`)
    }

    // Get jsonContentHash
    var jsonContentHash: string | null = null

    if (jsonContent != null) {

      // Blake3 hash
      jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()
    }

    // Create the node
    const intentCodeIndexedData = await
            sourceNodeModel.upsert(
              prisma,
              undefined,      // id
              parentNode.id,  // parentId
              instanceId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.intentCodeIndexedData,
              null,           // path
              name,
              null,           // content
              null,           // contentHash
              jsonContent,
              jsonContentHash,
              new Date())     // contentUpdated

    // Return
    return intentCodeIndexedData
  }

  async getOrCreateIntentCodeProject(
          prisma: PrismaClient,
          instanceId: string,
          name: string,
          localPath: string) {

    // Debug
    const fnName = `${this.clName}.getOrCreateIntentCodeProject()`

    // Try to get the node
    var intentCodeProject = await
          sourceNodeModel.getByUniqueKey(
            prisma,
            null,  // parentId
            instanceId,
            SourceNodeTypes.intentCodeProject,
            name)

    if (intentCodeProject != null) {
      return intentCodeProject
    }

    // Create the node
    intentCodeProject = await
      sourceNodeModel.create(
        prisma,
        null,  // parentId
        instanceId,
        BaseDataTypes.activeStatus,
        SourceNodeTypes.intentCodeProject,
        localPath,
        name,
        null,  // content
        null,  // contentHash
        null,  // jsonContent
        null,  // jsonContentHash
        null)  // contentUpdated

    // Return
    return intentCodeProject
  }

  async linkIntentCodeProjectToSourceCodeProject(
          prisma: PrismaClient,
          intentCodeProject: SourceNode,
          sourceCodeProject: SourceNode) {

    // Debug
    const fnName = `${this.clName}.linkIntentCodeProjectToSourceCodeProject()`

    // Validate
    if (intentCodeProject == null) {
      throw new CustomError(`${fnName}: intentCodeProject == null`)
    }

    if (sourceCodeProject == null) {
      throw new CustomError(`${fnName}: sourceCodeProject == null`)
    }

    if (intentCodeProject.type !== SourceNodeTypes.intentCodeProject) {
      throw new CustomError(`${fnName}: intentCodeProject.type !== ` +
                            `SourceNodeTypes.intentCodeProject`)
    }

    if (sourceCodeProject.type !== SourceNodeTypes.sourceCodeProject) {
      throw new CustomError(`${fnName}: sourceCodeProject.type !== ` +
                            `SourceNodeTypes.sourceCodeProject`)
    }

    // Upsert the Source Edge
    const sourceEdge = await
            sourceEdgeModel.upsert(
              prisma,
              undefined,  // id
              intentCodeProject.id,
              sourceCodeProject.id,
              BaseDataTypes.activeStatus,
              SourceEdgeTypes.implements)

    // Return
    return sourceEdge
  }
}
