import { PrismaClient, SourceNode } from '@prisma/client'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service'
import { DepsTools } from '@/types/build-types'
import { PackageJsonManagedFileService } from './package-json-service'

// Services
const dependenciesQueryService = new DependenciesQueryService()
const packageJsonManagedFileService = new PackageJsonManagedFileService()

// Class
export class ManagedDepsFileService {

  // Consts
  clName = 'ManagedDepsFileService'

  // Code
  async updateAndWriteFile(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.updateAndWriteFile()`

    // Get Deps node
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              prisma,
              intentCodeProjectNode)

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
    if (depsNode.jsonContent.tool == null) {

      console.log(
        `No deps tool specified.\n` +
        `This is usually done when installing a required extension with a ` +
        `hooks file.`)

      process.exit(1)
    }

    // Process by tool name
    switch (depsNode.jsonContent.tool) {

      case DepsTools.npm: {
        await packageJsonManagedFileService.run(
                prisma,
                intentCodeProjectNode)

        break
      }

      default: {
        console.log(`Unhandled deps tool: ${depsNode.jsonContent.tool}`)
        process.exit(1)
      }
    }
  }
}
