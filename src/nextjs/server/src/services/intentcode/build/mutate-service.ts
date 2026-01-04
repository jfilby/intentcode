import { PrismaClient } from '@prisma/client'
import { BuildData, BuildStage, BuildStageType, IntentFileBuild } from '@/types/build-types'

export class BuildMutateService {

  // Consts
  clName = 'BuildMutateService'

  // Code
  addBuildStageTypes(buildStages: BuildStageType[]) {

    buildStages.push(BuildStageType.updateDeps)
    buildStages.push(BuildStageType.index)
    buildStages.push(BuildStageType.compile)
  }

  createNextBuildStage(buildData: BuildData) {

    // Get buildNo
    const buildNo = buildData.curBuildNo + 1

    // Validate
    if (buildNo > buildData.buildStages.length) {

      console.log(`No more build stages`)
      return null
    }

    // Get all IntentCode files modified since last build
    var intentFileBuilds: Record<string, IntentFileBuild> = {}

    // Create BuildStage
    const buildStage: BuildStage = {
      buildNo: buildNo,
      buildStageType: buildData.buildStageTypes[buildNo - 1],
      depsUpdated: false,
      depsError: false,
      intentFileBuilds: intentFileBuilds
    }

    // Add to BuildData
    buildData.buildStages.push(buildStage)

    // Inc curBuildNo
    buildData.curBuildNo += 1

    // Return
    return buildStage
  }

  initBuildData(): BuildData {

    // Create initial build stages
    var buildStageTypes: BuildStageType[] = []

    this.addBuildStageTypes(buildStageTypes)

    // Initial builds array
    const buildStages: BuildStage[] = []

    // Create BuildData
    const buildData: BuildData = {
      curBuildNo: 0,  // Not yet started
      buildStages: buildStages,
      buildStageTypes: buildStageTypes
    }

    // Return
    return buildData
  }

  async runBuildStage(
          prisma: PrismaClient,
          buildStage: BuildStage) {

    ;
  }

  async runNextBuildStage(
          prisma: PrismaClient,
          buildData: BuildData) {

    // Create the next build if one is required
    const buildStage = this.createNextBuildStage(buildData)

    if (buildStage == null) {

      console.log(`The build has completed`)
      return
    }

    // Run the build stage
    await this.runBuildStage(
            prisma,
            buildStage)

    // Have the dependencies been updated since the last build? Were there any
    // errors? If so then add another set of stages
    if (buildStage.depsUpdated === true &&
        buildStage.depsError === true) {

      // Remove pending build stage types
      while (buildData.buildStageTypes.length > buildStage.buildNo) {
        buildData.buildStageTypes.pop()
      }

      // Add a fresh set of build stage types, which start with updating deps
      this.addBuildStageTypes(buildData.buildStageTypes)
    }
  }
}
