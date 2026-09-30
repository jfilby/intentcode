/**
 * Setting a project up for its first build.
 *
 * A project is a directory holding an intent.toml, and this is the part of
 * setting one up that is the engine's: laying out the nodes a build reads,
 * which is the project node, the `.intentcode` directory node, the extensions
 * node and the deps node read out of `deps.json`.
 */

import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import type { ProjectRecord, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { DependenciesMutateService } from '../graphs/dependencies/mutate-service.js'
import { DepsJsonService } from '../managed-files/deps/deps-json-service.js'
import { DotIntentCodeGraphMutateService } from
  '../graphs/dot-intentcode/graph-mutate-service.js'
import { ExtensionMutateService } from
  '../extensions/extension/mutate-service.js'
import { LoadExternalExtensionsService } from
  '../extensions/extension/load-external-service.js'
import { ProjectGraphMutateService } from '../graphs/project/mutate-service.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const depsJsonService = new DepsJsonService()
const dotIntentCodeGraphMutateService =
  new DotIntentCodeGraphMutateService()
const extensionMutateService = new ExtensionMutateService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const projectGraphMutateService = new ProjectGraphMutateService()

export class ProjectSetupService {

  clName = 'ProjectSetupService'

  async loadConfigFiles(
    store: ProjectStore,
    projectNode: SourceNodeRecord,
    configPath: string
  ) {

    if (fs.existsSync(configPath) === false) {
      await fs.promises.mkdir(configPath, { recursive: true })
    }

    await this.loadDepsConfigFile(store, projectNode, configPath)
  }

  /**
   * Reads `deps.json` out of the project's config directory into the deps
   * node, then loads the extensions it names. The deps node is the engine's
   * view of what the project depends on; the file is the user's, and the node
   * is kept in step with it.
   */
  async loadDepsConfigFile(
    store: ProjectStore,
    projectNode: SourceNodeRecord,
    configPath?: string
  ) {

    void configPath

    const { found, data, filename } =
      await depsJsonService.readFile(store, projectNode)

    if (found === false) return undefined

    let depsNode = await dependenciesMutateService.getOrCreateDepsNode(
      store, projectNode)

    const jsonContent: Record<string, unknown> =
      (depsNode.jsonContent as Record<string, unknown> | null) ?? {}

    if (data != null) {
      for (const [key, value] of Object.entries(data)) {
        jsonContent[key] = value
      }
    }

    const jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()

    depsNode = await sourceNodeModel.setJsonContent(
      store,
      depsNode.id,
      jsonContent,
      jsonContentHash)

    // The extensions named in the file are the engine's bundled ones, so they
    // are read out of the engine directory and written into this project.
    const extensions = jsonContent.extensions

    if (extensions != null &&
        typeof extensions === 'object' &&
        !Array.isArray(extensions)) {

      console.log(`Loading extensions specified in ${filename}..`)

      await loadExternalExtensionsService.loadBundledExtensionNodes(
        store,
        projectNode.projectId,
        extensions as Record<string, string>)
    }

    return depsNode
  }

  /**
   * Lays out the nodes a build reads. Every one of them is created if it is
   * not there, so this is safe to run against a project that has been built
   * before and one that has not.
   */
  async setupProject(
    store: ProjectStore,
    project: ProjectRecord
  ): Promise<SourceNodeRecord> {

    const projectNode = await projectGraphMutateService.getOrCreateProject(
      store,
      project.id,
      project.name,
      project.path)

    const dotIntentCodePath = path.join(project.path, '.intentcode')

    await dotIntentCodeGraphMutateService.getOrCreateDotIntentCodeProject(
      store,
      projectNode,
      dotIntentCodePath)

    await extensionMutateService.getOrCreateExtensionsNode(
      store,
      project.id)

    if (fs.existsSync(dotIntentCodePath)) {
      await this.loadConfigFiles(store, projectNode, dotIntentCodePath)
    }

    return projectNode
  }
}
