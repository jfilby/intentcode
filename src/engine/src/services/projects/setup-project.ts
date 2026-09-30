/**
 * Setting a project up for its first build.
 *
 * A project is a directory, so most of what used to happen here — validating
 * a name, recording a path, refusing a duplicate — is now a property of the
 * filesystem and is handled by `ProjectRegistryService`. What is left is the
 * part that is genuinely the engine's: laying out the nodes a build reads,
 * which is the project node, the `.intentcode` directory node, the extensions
 * node and the deps node read out of `deps.json`.
 */

import fs from 'fs'
import path from 'path'
import { blake3 } from '@noble/hashes/blake3'
import { input } from '@inquirer/prompts'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { DependenciesMutateService } from '../graphs/dependencies/mutate-service.js'
import { DepsJsonService } from '../managed-files/deps/deps-json-service.js'
import { DotIntentCodeGraphMutateService } from
  '../graphs/dot-intentcode/graph-mutate-service.js'
import { ExtensionMutateService } from '../extensions/extension/mutate-service.js'
import { FsUtilsService } from '../utils/fs-utils-service.js'
import { ProjectRegistryService } from './project-registry.js'
import { ProjectGraphMutateService } from '../graphs/project/mutate-service.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const dependenciesMutateService = new DependenciesMutateService()
const depsJsonService = new DepsJsonService()
const dotIntentCodeGraphMutateService =
  new DotIntentCodeGraphMutateService()
const extensionMutateService = new ExtensionMutateService()
const fsUtilsService = new FsUtilsService()
const projectRegistryService = new ProjectRegistryService()
const projectGraphMutateService = new ProjectGraphMutateService()

export class ProjectSetupService {

  clName = 'ProjectSetupService'

  /**
   * A name for a project that is not already taken. Two projects with the
   * same name are a problem because a build carries both and refers to them
   * by name, so the caller is asked again rather than being given one.
   */
  async getOrPromptForProjectName(
    path: string,
    parentProject: ProjectRecord | undefined
  ): Promise<string> {

    // Debug
    const fnName = `${this.clName}.getOrPromptForProjectName()`

    // A path with no last part is the filesystem root, which has no
    // directory name to suggest and nothing to build in.
    const suggestion = fsUtilsService.getLastPathPart(path)

    if (suggestion == null) {
      throw new IntentError({
        category: 'ProjectError',
        stage: fnName,
        message: `${path} is a filesystem root, not a project directory`
      })
    }

    let projectName = suggestion
    let clash = await this.findProjectByName(projectName)

    while (clash != null) {

      console.log(`The project name ${projectName} isn't unique`)

      if (parentProject != null) {
        console.log(`.. under the parent project: ${parentProject.name}`)
      }

      projectName = await input({ message: `project name> ` })

      if (projectName == null || projectName.trim() === '') {
        throw new IntentError({
          category: 'ValidationError',
          stage: fnName,
          message: 'a project needs a name'
        })
      }

      clash = await this.findProjectByName(projectName)
    }

    return projectName
  }

  /**
   * Whether a name is already used. The search is over the projects under the
   * working directory rather than over a table, so a project outside the
   * working directory cannot collide with one inside it by accident.
   */
  async findProjectByName(
    projectName: string
  ): Promise<ProjectRecord | undefined> {

    return await projectRegistryService.getProjectByNameOrKey(
      process.cwd(),
      projectName)
  }

  /**
   * Makes a directory a project, prompting for a name if it is not one yet,
   * and lays out the nodes a build reads. Returns the project and its root
   * node.
   */
  async initProject(
    projectPath: string
  ): Promise<{
    project: ProjectRecord
    store: ProjectStore
    projectNode: SourceNodeRecord
    projectName: string
  }> {

    // Debug
    const fnName = `${this.clName}.initProject()`

    if (fs.existsSync(projectPath) === false) {
      throw new IntentError({
        category: 'ProjectError',
        stage: fnName,
        message: `no directory at ${projectPath}`
      })
    }

    // A directory with an intent.toml is already a project; one without gets
    // one, which is the only step that used to be "register the project".
    const existing =
      await projectRegistryService.getProjectByPath(projectPath)

    let project: ProjectRecord

    if (existing != null && existing.path === path.resolve(projectPath)) {
      project = existing
    } else {
      const parentProject =
        await projectRegistryService.getProjectByPath(
          path.dirname(path.resolve(projectPath)))

      const projectName =
        await this.getOrPromptForProjectName(projectPath, parentProject)

      project = await projectRegistryService.createProject(
        projectPath, projectName)
    }

    const store = projectRegistryService.getStore(project)

    const projectNode = await this.setupProject(store, project)

    return { project, store, projectNode, projectName: project.name }
  }

  /**
   * Prompts for a directory and initialises it. Pressing Enter takes the
   * working directory, which is the common case when a project is being
   * created in the place the user is standing.
   */
  async initProjectFromCli(): Promise<void> {

    console.log(`Project path? Press enter to use the current path`)

    const inputProjectPath = await input({ message: `>` })

    const projectPath = inputProjectPath.trim().length === 0
      ? process.cwd()
      : inputProjectPath

    await this.initProject(projectPath)
  }

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

    // The extensions named in the file are copied in from the System project,
    // which is where the bundled ones live.
    const extensions = jsonContent.extensions

    if (Array.isArray(extensions)) {
      console.log(`Loading extensions specified in ${filename}..`)

      const system = projectRegistryService.getSystemProject()

      await extensionMutateService.loadExtensionNodesInSystemToUserProject(
        projectRegistryService.getStore(system),
        store,
        projectNode.projectId,
        extensions as string[])
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
