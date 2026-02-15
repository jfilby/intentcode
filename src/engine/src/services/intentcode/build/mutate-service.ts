import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData, BuildStage, BuildStageType, IntentFileBuild } from '@/types/build-types'
import { CompilerMetaDataApproachs, ProjectDetails, ServerOnlyTypes } from '@/types/server-only-types'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { DeleteBuildService } from './delete-service'
import { DepsUpdateService } from '@/services/managed-files/deps/update-service'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { IntentCodeAnalyzerMutateService } from '../analyzer/mutate-service'
import { ProjectsQueryService } from '@/services/projects/query-service'
import { ProjectCompileService } from '@/services/projects/compile-service'
import { ProjectVerifyService } from '@/services/projects/verify-service'
import { TechStackMutateService } from '@/services/intentcode/tech-stack/mutate-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const deleteBuildService = new DeleteBuildService()
const depsUpdateService = new DepsUpdateService()
const extensionQueryService = new ExtensionQueryService()
const intentCodeAnalyzerMutateService = new IntentCodeAnalyzerMutateService()
const projectCompileService = new ProjectCompileService()
const projectsQueryService = new ProjectsQueryService()
const projectVerifyService = new ProjectVerifyService()
const techStackMutateService = new TechStackMutateService()

// Class
export class BuildMutateService {

  // Consts
  clName = 'BuildMutateService'

  // Code
  createNextBuildStage(buildData: BuildData) {

    // Debug
    const fnName = `${this.clName}.createNextBuildStage()`

    // Get buildNo
    const buildNo = buildData.curBuildNo + 1

    // Validate
    if (buildNo > buildData.buildStageTypes.length) {

      console.log(`No more build stages`)

      // console.log(`${fnName}: ${buildNo} > ` +
      //             `${buildData.buildStageTypes.length}`)

      return null
    }

    // Get all IntentCode files modified since last build
    var intentFileBuilds: Record<string, IntentFileBuild> = {}

    // Create BuildStage
    const buildStage: BuildStage = {
      buildNo: buildNo,
      buildStageType: buildData.buildStageTypes[buildNo - 1],
      depsUpdated: false,
      intentFileBuilds: intentFileBuilds
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
    var buildStages = [
      // Verify (pre-checks)
      BuildStageType.verifyInternals,
      // Specs to IntentCode
      BuildStageType.defineTechStack,
      // IntentCode to source
      BuildStageType.updateDeps,
      BuildStageType.intentCodeAnalyzer
    ]

    // Is the indexer approach enabled?
    if (ServerOnlyTypes.compilerMetaDataApproach === CompilerMetaDataApproachs.indexer) {
      buildStages.push(BuildStageType.index)
    }

    // Add final build stages
    buildStages = buildStages.concat([
      BuildStageType.compile,
      BuildStageType.updateDeps,
      // Verify (post-checks)
      BuildStageType.verifyInternals
    ])

    return buildStages
  }

  async initBuildData(
          prisma: PrismaClient,
          instanceId: string): Promise<BuildData> {

    // Debug
    const fnName = `${this.clName}.initBuildData()`

    // Create initial build stages
    var buildStageTypes: BuildStageType[] =
      this.getBuildStageTypes()

    // Initial builds array
    const buildStages: BuildStage[] = []

    // Get numbered projects map
    const projects: Record<number, ProjectDetails> = {}

    await projectsQueryService.createProjectsList(
      prisma,
      instanceId,
      undefined,  // instance
      projects)

    // Load extensions
    const extensionsData = await
      extensionQueryService.loadExtensions(
        prisma,
        instanceId)

    // Validate
    if (extensionsData == null) {
      throw new CustomError(`${fnName}: extensionsData == null`)
    }

    // Delete old build graphs
    await deleteBuildService.deleteOldBuildGraphs(
      prisma,
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
          prisma: PrismaClient,
          instanceId: string,
          projectName: string) {

    // Debug
    const fnName = `${this.clName}.runBuild()`

    // Get IntentCode project node
    const projectNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              null,                     // parentId
              instanceId,
              SourceNodeTypes.project,  // type
              projectName)

    // Validate
    if (projectNode == null) {
      throw new CustomError(`${fnName}: projectNode == null`)
    }

    // Init BuildData
    const buildData = await
            this.initBuildData(
              prisma,
              instanceId)

    // Debug
    // console.log(`${fnName}: buildData: ` + JSON.stringify(buildData))

    // Iterate until completed
    var nextIter = true

    while (nextIter === true) {

      nextIter = await
        this.runNextBuildStage(
          prisma,
          projectNode,
          buildData)
    }
  }

  async runBuildStage(
          prisma: PrismaClient,
          projectNode: SourceNode,
          buildData: BuildData) {

    // Debug
    const fnName = `${this.clName}.runBuildStage()`

    // Get buildStage
    const buildStage = buildData.buildStages[buildData.curBuildNo - 1]

    // Route by build stage type
    switch (buildStage.buildStageType) {

      case BuildStageType.defineTechStack: {

        await techStackMutateService.processTechStack(
          prisma,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.intentCodeAnalyzer: {

        await intentCodeAnalyzerMutateService.run(
          prisma,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.updateDeps: {

        await depsUpdateService.update(
          prisma,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.index: {

        await projectCompileService.runIndexBuildStage(
          prisma,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.compile: {

        await projectCompileService.runCompileBuildStage(
          prisma,
          buildData,
          projectNode)

        break
      }

      case BuildStageType.verifyInternals: {

        await projectVerifyService.run(
          prisma,
          projectNode)

        break
      }

      default: {
        throw new CustomError(`${fnName}: invalid buildStageType: ${buildStage.buildStageType}`)
      }
    }
  }

  async runNextBuildStage(
          prisma: PrismaClient,
          projectNode: SourceNode,
          buildData: BuildData) {

    // Create the next build if one is required
    const buildStage = this.createNextBuildStage(buildData)

    if (buildStage == null) {

      console.log(`The build has completed`)
      return false
    }

    // Run the build stage
    await this.runBuildStage(
            prisma,
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
