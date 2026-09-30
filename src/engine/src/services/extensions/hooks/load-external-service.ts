import fs from 'fs'
import { blake3 } from '@noble/hashes/blake3'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { walkDir } from '@/core/walk-dir.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service.js'

// Types

/**
 * A hooks file: the `name` the hook node is keyed by, and the deps tool the
 * extension wants its projects to use, plus whatever else the extension
 * declares. The file is read off disk, so only the fields read here are named
 * and anything else it holds is carried through as-is.
 */
type HooksJson = {
  name?: string
  deps?: {
    packageManager?: string
  } | null
  [key: string]: unknown
}

/**
 * The `source` block of a deps node, as this service writes it: the tool the
 * project's dependencies are installed with.
 */
type DepsJson = {
  source?: {
    packageManager?: string
  } | null
  [key: string]: unknown
}


// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()

// Class
export class LoadExternalHooksService {

  // Consts
  clName = 'LoadExternalHooksService'

  // Code
  async loadFromPath(
          store: ProjectStore,
          projectId: string,
          extensionNode: SourceNodeRecord,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadFromPath()`

    // Validate
    if (projectId == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'projectId == null'
      })
    }

    if (loadPath == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'loadPath == null'
      })
    }

    // Walk dir for json files
    const jsonFiles: string[] = []

    await walkDir(
            loadPath,
            jsonFiles,
            {
              recursive: true,
              fileExts: ['.json']
            })

    // Load each file
    for (const jsonFile of jsonFiles) {

      await this.loadHooksJsonFile(
              store,
              projectId,
              extensionNode,
              jsonFile)
    }
  }

  async loadHooksJsonFile(
          store: ProjectStore,
          projectId: string,
          extensionNode: SourceNodeRecord,
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
            store,
            projectId,
            extensionNode,
            hooksJson)
  }

  async saveHooks(
          store: ProjectStore,
          projectId: string,
          extensionNode: SourceNodeRecord,
          hooksJson: HooksJson | null) {

    // Debug
    const fnName = `${this.clName}.saveHooks()`

    // Validate
    if (hooksJson == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'hooksJson == null'
      })
    }

    if (hooksJson.name == null) {
      console.error(`name field is missing`)
    }

    // Get jsonContentHash
    let hooksJsonHash: string | null = null

    if (hooksJson != null) {

      // Blake3 hash
      hooksJsonHash = blake3(JSON.stringify(hooksJson)).toString()
    }

    // Upsert hook node
    await
            sourceNodeModel.upsert(
              store,
              undefined,         // id
              extensionNode.id,  // parentId
              projectId,
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
          store: ProjectStore,
          projectId: string,
          hooksJson: HooksJson) {

    // Debug
    const fnName = `${this.clName}.setDepsToolForProjects()`

    // Get project nodes
    const projectNodes = await
            sourceNodeModel.filter(
              store,
              null,                     // parentId
              projectId,
              SourceNodeTypes.project)  // type

    // Debug
    console.log(
      `${fnName}: setting up deps tool for ${projectNodes.length} projects ` +
      `with projectId: ${projectId}..`)

    // Skip if no projects
    if (projectNodes.length === 0) {
      return
    }

    // Check for a specified deps tool
    const packageManager = hooksJson.deps?.packageManager

    if (packageManager == null) {

      // Debug
      // console.log(`${fnName}: hooksJson: ` + JSON.stringify(hooksJson))

      // Use AI to infer a deps tool
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'using AI to infer deps tool is unimplemented'
      })
    }

    // Set deps tool for each project
    for (const projectNode of projectNodes) {

      await this.setPackageManagerForProject(
              store,
              projectId,
              projectNode,
              packageManager)
    }
  }

  async setPackageManagerForProject(
          store: ProjectStore,
          projectId: string,
          projectNode: SourceNodeRecord,
          packageManager: string) {

    // Debug
    const fnName = `${this.clName}.setPackageManagerForProject()`

    console.log(`${fnName}: setting up deps tool for project..`)

    // console.log(`${fnName}: updating projectIntentCodeNode.id: ` +
    //             `${projectIntentCodeNode.id}`)

    // Get/create Deps node
    let depsNode = await
          dependenciesMutateService.getOrCreateDepsNode(
            store,
            projectNode)

    // Already set?
    if ((depsNode.jsonContent as DepsJson | null)
          ?.source?.packageManager === packageManager) {

      console.log(
        `${fnName}: skipping, package manager already set as expected`)

      return
    }

    // Set jsonContent?
    if (depsNode.jsonContent == null) {
      depsNode.jsonContent = {}
    }

    // Set deps tool
    const depsNodeJson = depsNode.jsonContent as DepsJson

    if (depsNodeJson.source == null) {
      depsNodeJson.source = {}
    }

    depsNodeJson.source.packageManager = packageManager

    // Debug
    // console.log(`${fnName}: depsNode.jsonContent: ` +
    //             JSON.stringify(depsNode.jsonContent))

    // Get jsonContentHash
    const depsNodeJsonHash =
      blake3(JSON.stringify(depsNodeJson)).toString()

    // Save node
    depsNode = await
      sourceNodeModel.setJsonContent(
        store,
        depsNode.id,
        depsNodeJson,
        depsNodeJsonHash)

    // Debug
    // console.log(`${fnName}: updated depsNode with id: ${depsNode.id}`)
  }
}
