import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service'
import { DepsTools } from '@/types/build-types'
import { DependenciesMutateService } from '@/services/graphs/dependencies/mutate-service'
import { DepsJsonService } from './deps-json-service'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { PackageJsonManagedFileService } from './package-json-service'

// Services
const dependenciesMutateService = new DependenciesMutateService()
const dependenciesQueryService = new DependenciesQueryService()
const depsJsonService = new DepsJsonService()
const extensionQueryService = new ExtensionQueryService()
const packageJsonManagedFileService = new PackageJsonManagedFileService()

// Class
export class SourceDepsFileService {

  // Consts
  clName = 'SourceDepsFileService'

  // Code
  async inferPackageManagerFromExtensions(
          prisma: PrismaClient,
          projectNode: SourceNode,
          depsNode: any) {

    // Debug
    const fnName = `${this.clName}.inferPackageManagerFromExtensions()`

    // Get system extensions
    const extensionsData = await
            extensionQueryService.loadExtensions(
              prisma,
              projectNode.instanceId)

    // Validate
    if (extensionsData == null) {
      throw new CustomError(`${fnName}: extensionsData == null`)
    }

    // Output
    console.log(
      `Inferring package manager from ${extensionsData.hooksNodes.length} ` +
      `extension hooks..`)

    // Look for one that specifies a package manager
    var packageManager: string | undefined = undefined

    for (const hooksNode of extensionsData.hooksNodes) {

      // Debug
      // console.log(`${fnName}: hooksNode.jsonContent: ` +
      //             JSON.stringify(hooksNode.jsonContent))

      // Is a packageManager specified?
      if ((hooksNode.jsonContent as any).deps.packageManager != null) {

        packageManager = (hooksNode.jsonContent as any).deps.packageManager
        break
      }
    }

    // Output
    console.log(`.. found packageManager: ${packageManager}`)

    // Validate
    if (packageManager == null) {
      return
    }

    // Set in depsNode
    if (depsNode.jsonContent.source == null) {
      depsNode.jsonContent.source = {}
    }

    depsNode.jsonContent.source.packageManager = packageManager

      // Update depsNode
      await dependenciesMutateService.updateDepsNode(
              prisma,
              projectNode,
              depsNode,
              true)  // writeToDepsJson
  }

  async updateAndWriteFile(
          prisma: PrismaClient,
          projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.updateAndWriteFile()`

    // Get Deps node
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              prisma,
              projectNode)

    // Validate
    if (depsNode == null) {

      console.log(
        `No deps setup.\n` +
        `This is usually done when installing a required extension with a ` +
        `hooks file.`)

      process.exit(1)
    }

    // Debug
    console.log(`${fnName}: depsNode.jsonContent: ` +
                JSON.stringify(depsNode.jsonContent))

    // Continue validating
    if (depsNode.jsonContent.source?.packageManager == null) {

      // Infer a package manager from the available extensions
      await this.inferPackageManagerFromExtensions(
              prisma,
              projectNode,
              depsNode)

      // Failed?
      if (depsNode.jsonContent.source?.packageManager == null) {

        console.log(
          `No source package manager specified.\n` +
          `This is usually done when installing a required extension with a ` +
          `hooks file.`)

        process.exit(1)
      }
    }

    // Process by tool name
    switch (depsNode.jsonContent.source.packageManager) {

      case DepsTools.npm: {
        await packageJsonManagedFileService.run(
                prisma,
                projectNode,
                depsNode)

        break
      }

      default: {
        console.log(
          `Unhandled deps tool: ${depsNode.jsonContent.source.packageManager}`)

        process.exit(1)
      }
    }
  }
}
