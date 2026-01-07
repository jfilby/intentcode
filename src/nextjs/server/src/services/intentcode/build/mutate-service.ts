import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BuildData, BuildStage, BuildStageType, IntentFileBuild } from '@/types/build-types'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { ManagedDepsFileService } from '@/services/managed-files/deps/generic-service'
import { ProjectCompileService } from '@/services/projects/compile-service'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const extensionQueryService = new ExtensionQueryService()
const managedDepsFileService = new ManagedDepsFileService()
const projectCompileService = new ProjectCompileService()

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

    return [
      BuildStageType.updateDeps,
      BuildStageType.index,
      BuildStageType.compile
    ]
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

    // Load extensions
    const extensionsData = await
            extensionQueryService.loadExtensions(
              prisma,
              instanceId)

    // Validate
    if (extensionsData == null) {
      throw new CustomError(`${fnName}: extensionsData == null`)
    }

    // Create BuildData
    const buildData: BuildData = {
      curBuildNo: 0,  // Not yet started
      buildStages: buildStages,
      buildStageTypes: buildStageTypes,
      extensionsData: extensionsData
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
    const intentCodeProjectNode = await
            sourceNodeModel.getByUniqueKey(
              prisma,
              null,  // parentId
              instanceId,
              SourceNodeTypes.intentCodeProject,  // type
              projectName)

    // Validate
    if (intentCodeProjectNode == null) {
      throw new CustomError(`${fnName}: intentCodeProjectNode == null`)
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
          intentCodeProjectNode,
          buildData)
    }
  }

  async runBuildStage(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode,
          buildData: BuildData) {

    // Debug
    const fnName = `${this.clName}.runBuildStage()`

    // Get buildStage
    const buildStage = buildData.buildStages[buildData.curBuildNo - 1]

    // Route by build stage type
    switch (buildStage.buildStageType) {

      case BuildStageType.updateDeps: {

        await managedDepsFileService.updateAndWriteFile(
                prisma,
                intentCodeProjectNode)

        break
      }

      case BuildStageType.index: {

        await projectCompileService.runIndexBuildStage(
                prisma,
                buildData,
                intentCodeProjectNode)

        break
      }

      case BuildStageType.compile: {

        await projectCompileService.runCompileBuildStage(
                prisma,
                buildData,
                intentCodeProjectNode)

        break
      }

      default: {
        throw new CustomError(`${fnName}: invalid buildStageType: ${buildStage.buildStageType}`)
      }
    }
  }

  async runNextBuildStage(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode,
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
            intentCodeProjectNode,
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
