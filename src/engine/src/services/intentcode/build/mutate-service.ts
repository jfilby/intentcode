import path from 'path'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BuildData, BuildStage, BuildStageType } from '@/types/build-types.js'
import { ProjectDetails } from '@/types/server-only-types.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { DeleteBuildService } from './delete-service.js'
import { DepsSyncService } from '@/services/managed-files/deps/sync-service.js'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service.js'
import { IntentCodeAnalyzerMutateService } from '../analyzer/mutate-service.js'
import { ProjectCompileService } from '@/services/projects/compile-service.js'
import { readProject } from '@/core/project.js'
import { ProjectVerifyService } from '@/services/projects/verify-service.js'
import { TechStackMutateService } from '@/services/intentcode/tech-stack/mutate-service.js'
import { BuildsGraphMutateService } from '@/services/graphs/builds/mutate-service.js'
import { DotIntentCodeGraphQueryService } from '@/services/graphs/dot-intentcode/graph-query-service.js'
import { IntentCodeAnalysisGraphMutateService } from '@/services/graphs/intentcode-analysis/mutate-service.js'
import { IntentCodeGraphMutateService } from '@/services/graphs/intentcode/graph-mutate-service.js'
import { ProjectGraphQueryService } from '@/services/graphs/project/query-service.js'
import { SourceCodeGraphMutateService } from '@/services/graphs/source-code/graph-mutate-service.js'
import { SpecsGraphQueryService } from '@/services/graphs/specs/graph-query-service.js'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const buildsGraphMutateService = new BuildsGraphMutateService()
const deleteBuildService = new DeleteBuildService()
const depsSyncService = new DepsSyncService()
const dotIntentCodeGraphQueryService = new DotIntentCodeGraphQueryService()
const extensionQueryService = new ExtensionQueryService()
const intentCodeAnalysisGraphMutateService = new IntentCodeAnalysisGraphMutateService()
const intentCodeAnalyzerMutateService = new IntentCodeAnalyzerMutateService()
const intentCodeGraphMutateService = new IntentCodeGraphMutateService()
const projectCompileService = new ProjectCompileService()
const projectGraphQueryService = new ProjectGraphQueryService()
const projectVerifyService = new ProjectVerifyService()
const sourceCodeGraphMutateService = new SourceCodeGraphMutateService()
const specsGraphQueryService = new SpecsGraphQueryService()
const techStackMutateService = new TechStackMutateService()

// Class
export class BuildMutateService {

  // Consts
  clName = 'BuildMutateService'

  // Code
  createNextBuildStage(buildData: BuildData) {

    // Get buildNo
    const buildNo = buildData.curBuildNo + 1

    // Validate
    if (buildNo > buildData.buildStageTypes.length) {

      console.log(`No more build stages`)

      // console.log(`${fnName}: ${buildNo} > ` +
      //             `${buildData.buildStageTypes.length}`)

      return null
    }

    // Create BuildStage
    const buildStage: BuildStage = {
      buildNo: buildNo,
      buildStageType: buildData.buildStageTypes[buildNo - 1],
      depsUpdated: false
    }

    // Add to BuildData
    buildData.buildStages.push(buildStage)

    // Inc curBuildNo
    buildData.curBuildNo += 1

    // Return
    return buildStage
  }

  getBuildStageTypes() {

    // Initial build stages
    let buildStages = [
      // Verify (pre-checks)
      BuildStageType.verifyInternals,
      // Specs to IntentCode
      BuildStageType.defineTechStack,
      // IntentCode to source
      BuildStageType.updateDeps,
      BuildStageType.intentCodeAnalyzer
    ]

    // Add final build stages
    buildStages = buildStages.concat([
      BuildStageType.compile,
      BuildStageType.updateDeps,
      // Verify (post-checks)
      BuildStageType.verifyInternals
    ])

    return buildStages
  }

  /**
   * The nodes a build needs for one project, read from or created in that
   * project's own store.
   */
  async createProjectDetails(
          store: ProjectStore,
          indents: number,
          project: ProjectRecord) {

    // Debug
    const fnName = `${this.clName}.createProjectDetails()`

    // Get ProjectNode
    const projectNode = await
            projectGraphQueryService.getProjectNode(
              store,
              project.id)

    // Validate
    if (projectNode == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: projectNode == null`,
        detail: `the project ${project.key} has no Project node`
      })
    }

    // Determine paths
    const projectPath = project.path
    const intentPath = `${projectPath}${path.sep}intent`
    const srcPath = `${projectPath}`

    // Get DotIntentCodeProjectNode
    const dotIntentCodeProjectNode = await
      dotIntentCodeGraphQueryService.getDotIntentCodeProject(
        store,
        projectNode)

    // Get ProjectSpecsNode
    const projectSpecsNode = await
      specsGraphQueryService.getSpecsProjectNode(
        store,
        projectNode)

    // Get/create builds node
    const buildsNode = await
     buildsGraphMutateService.getOrCreateBuildsNode(
      store,
      projectNode)

    // Create a new build node
    const buildNode = await
      buildsGraphMutateService.createBuildNode(
        store,
        buildsNode)

    // Get or create ProjectIntentCodeNode
    const projectIntentCodeNode = await
      intentCodeGraphMutateService.getOrCreateIntentCodeProjectNode(
        store,
        buildNode,
        intentPath)

    // Get or create ProjectSourceNode
    const projectSourceNode = await
      sourceCodeGraphMutateService.getOrCreateSourceCodeProject(
        store,
        buildNode,
        srcPath)

    // Get or create ProjectIntentCodeAnalysisNode
    const projectIntentCodeAnalysisNode = await
      intentCodeAnalysisGraphMutateService.getOrCreateProjectIntentCodeAnalysisNode(
        store,
        buildNode)

    // Define ProjectDetails
    const projectDetails: ProjectDetails = {
      indents: indents,
      project: project,
      projectNode: projectNode,
      dotIntentCodeProjectNode: dotIntentCodeProjectNode,
      projectSpecsNode: projectSpecsNode,
      projectIntentCodeNode: projectIntentCodeNode,
      projectSourceNode: projectSourceNode,
      projectIntentCodeAnalysisNode: projectIntentCodeAnalysisNode
    }

    // Return
    return projectDetails
  }

  async initBuildData(
          store: ProjectStore,
          projectId: string): Promise<BuildData> {

    // Debug
    const fnName = `${this.clName}.initBuildData()`

    // Create initial build stages
    const buildStageTypes: BuildStageType[] =
      this.getBuildStageTypes()

    // Initial builds array
    const buildStages: BuildStage[] = []

    // The project being built. A project is a directory, so the store already
    // names it and its intent.toml is the one record of it.
    const project = await readProject(store.projectPath)

    // Validate
    if (project.id !== projectId) {

      throw new IntentError({
        category: 'ProjectError',
        stage: fnName,
        message: `${fnName}: the store holds ${project.key}, not ` +
          `${projectId}`,
        detail: `store.projectPath: ${store.projectPath}`
      })
    }

    // Get numbered projects map. A project is its own root, so a project
    // nested inside another is a separate build rather than a child of this
    // one.
    const projects: Record<number, ProjectDetails> = {
      1: await this.createProjectDetails(store, 0, project)
    }

    // Load extensions
    const extensionsData = await
      extensionQueryService.loadExtensions(
        store,
        projectId)

    // Validate
    if (extensionsData == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: extensionsData == null`
      })
    }

    // Delete old build graphs
    await deleteBuildService.deleteOldBuildGraphs(
      projects)

    // Create BuildData
    const buildData: BuildData = {
      curBuildNo: 0,  // Not yet started
      buildStages: buildStages,
      buildStageTypes: buildStageTypes,
      extensionsData: extensionsData,
      projects: projects
    }

    // Return
    return buildData
  }

  async runBuild(
          store: ProjectStore,
          projectId: string,
          projectName: string) {

    // Debug
    const fnName = `${this.clName}.runBuild()`

    // Get IntentCode project node
    const projectNode = await
            sourceNodeModel.getByUniqueKey(
              store,
              null,                     // parentId
              projectId,
              SourceNodeTypes.project,  // type
              projectName)

    // Validate
    if (projectNode == null) {
      throw new IntentError({
        category: 'StorageError',
        stage: fnName,
        message: `${fnName}: projectNode == null`
      })
    }

    // Init BuildData
    const buildData = await
            this.initBuildData(
              store,
              projectId)

    // Debug
    // console.log(`${fnName}: buildData: ` + JSON.stringify(buildData))

    // Iterate until completed
    let nextIter = true

    while (nextIter === true) {

      nextIter = await
        this.runNextBuildStage(
          store,
          projectNode,
          buildData)
    }
  }

  async runBuildStage(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          buildData: BuildData) {

    // Debug
    const fnName = `${this.clName}.runBuildStage()`

    // Get buildStage
    const buildStage = buildData.buildStages[buildData.curBuildNo - 1]

    // Route by build stage type
    switch (buildStage.buildStageType) {

      case BuildStageType.defineTechStack: {

        await techStackMutateService.processTechStack(
          store,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.intentCodeAnalyzer: {

        await intentCodeAnalyzerMutateService.run(
          store,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.updateDeps: {

        await depsSyncService.update(
          store,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.compile: {

        await projectCompileService.runCompileBuildStage(
          store,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.verifyInternals: {

        await projectVerifyService.run(
          store,
          buildData,
          projectNode)

        break
      }

      default: {
        throw new IntentError({
          category: 'CompilerError',
          stage: fnName,
          message: `${fnName}: invalid buildStageType: ` +
            `${buildStage.buildStageType}`
        })
      }
    }
  }

  async runNextBuildStage(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          buildData: BuildData) {

    // Create the next build if one is required
    const buildStage = this.createNextBuildStage(buildData)

    if (buildStage == null) {

      console.log(`The build has completed`)
      return false
    }

    // Run the build stage
    await this.runBuildStage(
            store,
            projectNode,
            buildData)

    // Have the dependencies been updated since the last build? Were there any
    // errors? If so then add another set of stages
    if (buildStage.depsUpdated === true) {

      // Remove pending build stage types
      while (buildData.buildStageTypes.length > buildStage.buildNo) {
        buildData.buildStageTypes.pop()
      }

      // Add a fresh set of build stage types, which start with updating deps
      buildData.buildStageTypes =
        buildData.buildStageTypes.concat(this.getBuildStageTypes())
    }

    // Return
    return true
  }
}
