const fs = require('fs')
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const walkDirService = new WalkDirService()

// Class
export class LoadExternalHooksService {

  // Consts
  clName = 'LoadExternalHooksService'

  // Code
  async loadFromPath(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: SourceNode,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadFromPath()`

    // Validate
    if (instanceId == null) {
      throw new CustomError(`${fnName}: instanceId == null`)
    }

    if (loadPath == null) {
      throw new CustomError(`${fnName}: loadPath == null`)
    }

    // Walk dir for json files
    var jsonFiles: string[] = []

    await walkDirService.walkDir(
            loadPath,
            jsonFiles,
            true,  // recursive
            ['.json'])

    // Load each file
    for (const jsonFile of jsonFiles) {

      await this.loadHooksJsonFile(
              prisma,
              instanceId,
              extensionNode,
              jsonFile)
    }
  }

  async loadHooksJsonFile(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: SourceNode,
          fullPath: string) {

    // Output
    console.log(`loading: ${fullPath}..`)

    // Read the file
    const hooksContents = fs.readFileSync(fullPath, 'utf-8')
    const hooksJson = JSON.parse(hooksContents)

    // Validate
    if (hooksJson == null) {
      console.error(`Error: hooks data not found`)
      return
    }

    // Save the hooks
    await this.saveHooks(
            prisma,
            instanceId,
            extensionNode,
            hooksJson)

    // Set the deps tool for all projects
    await this.setDepsToolForProjects(
            prisma,
            instanceId,
            hooksJson)
  }

  async saveHooks(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: SourceNode,
          hooksJson: any) {

    // Debug
    const fnName = `${this.clName}.saveHooks()`

    // Validate
    if (hooksJson == null) {
      throw new CustomError(`${fnName}: hooksJson == null`)
    }

    if (hooksJson.name == null) {
      console.error(`name field is missing`)
    }

    // Get jsonContentHash
    var hooksJsonHash: string | null = null

    if (hooksJson != null) {

      // Blake3 hash
      hooksJsonHash = blake3(JSON.stringify(hooksJson)).toString()
    }

    // Upsert hook node
    const hookNode = await
            sourceNodeModel.upsert(
              prisma,
              undefined,         // id
              extensionNode.id,  // parentId
              instanceId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.hooksType,
              hooksJson.name,    // name
              null,              // contentHash
              null,              // contentHash
              hooksJson,         // jsonContent
              hooksJsonHash,     // jsonContentHash
              new Date())        // contentUpdated
  }

  async setDepsToolForProjects(
          prisma: PrismaClient,
          instanceId: string,
          hooksJson: any) {

    // Debug
    const fnName = `${this.clName}.setDepsToolForProjects()`

    // Get IntentCode project node
    const intentCodeProjectNodes = await
            sourceNodeModel.filter(
              prisma,
              null,  // parentId
              instanceId,
              SourceNodeTypes.intentCodeProject)  // type

    // Skip if no projects
    if (intentCodeProjectNodes.length === 0) {
      return
    }

    // Check for a specified deps tool
    var depsTool = hooksJson.deps?.tool

    if (depsTool == null) {

      // Debug
      // console.log(`${fnName}: hooksJson: ` + JSON.stringify(hooksJson))

      // Use AI to infer a deps tool
      throw new CustomError(
        `${fnName}: using AI to infer deps tool is unimplemented`)
    }

    // Set deps tool for each project
    for (const intentCodeProjectNode of intentCodeProjectNodes) {

      await this.setDepsToolForProject(
              prisma,
              instanceId,
              intentCodeProjectNode,
              depsTool)
    }
  }

  async setDepsToolForProject(
          prisma: PrismaClient,
          instanceId: string,
          intentCodeProjectNode: SourceNode,
          depsTool: string) {

    // Debug
    const fnName = `${this.clName}.setDepsToolForProject()`

    // console.log(`${fnName}: updating intentCodeProjectNode.id: ` +
    //             `${intentCodeProjectNode.id}`)

    // Get/create Deps node
    var depsNode = await
          dependenciesMutateService.getOrCreateDepsNode(
            prisma,
            intentCodeProjectNode)

    // Already set?
    if (depsNode.jsonContent?.tool === depsTool) {
      console.log(`${fnName}: skipping, deps tool already set as expected`)
      return
    }

    // Set jsonContent?
    if (depsNode.jsonContent == null) {
      depsNode.jsonContent = {}
    }

    // Set deps tool
    depsNode.jsonContent.tool = depsTool

    // Debug
    // console.log(`${fnName}: depsNode.jsonContent: ` +
    //             JSON.stringify(depsNode.jsonContent))

    // Get jsonContentHash
    depsNode.jsonContentHash =
      blake3(JSON.stringify(depsNode.jsonContent)).toString()

    // Save node
    depsNode = await
      sourceNodeModel.setJsonContent(
        prisma,
        depsNode.id,
        depsNode.jsonContent,
        depsNode.jsonContentHash)

    // Debug
    // console.log(`${fnName}: updated depsNode with id: ${depsNode.id}`)
  }
}
