const semver = require('semver')
import { isEqual } from 'lodash'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service'
import { DepsJsonService } from './deps-json-service'

// Services
const depsJsonService = new DepsJsonService()
const dependenciesMutateService = new DependenciesMutateService()
const dependenciesQueryService = new DependenciesQueryService()

// Class
export class DepsVerifyService {

  // Consts
  clName = 'DepsVerifyService'

  // Code
  async verifyDepsNode(
    prisma: PrismaClient,
    projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.verifyDepsNode()`

    // Get Deps node
    const depsNode = await
      dependenciesQueryService.getDepsNode(
        prisma,
        projectNode)

    // Verify depsNode dependencies
    await this.verifyDepsNodeDependencies(
      prisma,
      projectNode,
      depsNode)

    // Verify depsNode matches deps.json
    await this.verifyDepsNodeSyncedToDepsJson(
      prisma,
      projectNode,
      depsNode)
  }

  async verifyDepsNodeDependencies(
          prisma: PrismaClient,
          projectNode: SourceNode,
          depsNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.verifyDepsNodeDependencies()`

    // Validate
    if (depsNode?.jsonContent == null) {
      return
    }

    // Get jsonContent as any
    const jsonContent = (depsNode.jsonContent) as any

    // Validate
    if (jsonContent.source?.packageManager == null ||
        jsonContent.source.packageManager !== 'npm' ||
        jsonContent.source?.deps == null) {

      return
    }

    // Debug
    // console.log(`${fnName}: depsNode.jsonContent.source.deps: ` +
    //   JSON.stringify(jsonContent.source.deps))

    // Verify semvers
    var modified = false

    for (const [packageName, minVersionNo] of
         Object.entries(jsonContent.source.deps)) {

      if (!semver.validRange(minVersionNo)) {

        console.log(
          `DepsNode dependency: ${packageName} has an invalid ` +
          `minVersionNo: ${minVersionNo} (removing..)`)

        modified = true
        jsonContent.source.deps[packageName] = undefined
      }
    }

    // Debug
    // console.log(`${fnName}: depsNode.jsonContent.source.deps: ` +
    //   JSON.stringify(jsonContent.source.deps))

    // Save?
    if (modified === true) {

      depsNode.jsonContent = jsonContent

      await dependenciesMutateService.updateDepsNode(
              prisma,
              projectNode,
              depsNode,
              true)  // writeToDepsJson
    }
  }

  async verifyDepsNodeSyncedToDepsJson(
          prisma: PrismaClient,
          projectNode: SourceNode,
          depsNode: SourceNode,
          writeIfFileNotFound: boolean = true) {

    // Debug
    const fnName = `${this.clName}.verifyDepsNodeSyncedToDepsJson()`

    // Read deps.json
    const { found, data, filename } = await
            depsJsonService.readFile(
              prisma,
              projectNode)

    // File not found?
    if (found === false) {

      // Write file if not found?
      if (writeIfFileNotFound === true) {

        await depsJsonService.writeToFile(
                prisma,
                projectNode,
                depsNode)
      }

      // Done
      return
    }

    // Verify that they're the same
    if (isEqual(
          depsNode.jsonContent,
          data) === false) {

      console.log(`${fnName}: depsNode.jsonContent: ` +
                  JSON.stringify(depsNode.jsonContent))

      console.log(`${fnName}: ${filename}`)
      console.log(`${fnName}: deps.json file: ` + JSON.stringify(data))

      throw new CustomError(`${fnName}: depsNode (jsonContent) !== deps.json`)
    }
  }
}
