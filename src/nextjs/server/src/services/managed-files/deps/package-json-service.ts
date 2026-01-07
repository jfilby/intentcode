import fs from 'fs'
import path from 'path'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ImportsData } from '@/services/source-code/imports/types'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service'
import { GraphQueryService } from '@/services/graphs/intentcode/graph-query-service'
import { ReadJsTsSourceImportsService } from '@/services/source-code/imports/read-js-ts-service'

// Services
const dependenciesQueryService = new DependenciesQueryService()
const graphQueryService = new GraphQueryService()
const readJsTsSourceImportsService = new ReadJsTsSourceImportsService()

// Class
export class PackageJsonManagedFileService {

  // Consts
  clName = 'PackageJsonManagedFileService'

  // Code
  async enrichFromDepsNode(
          prisma: PrismaClient,
          intentCodeProjectNode: SourceNode,
          importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.processSrcFile()`

    // Get depsNode
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              prisma,
              intentCodeProjectNode)

    // Validate
    if (depsNode?.jsonContent == null) {
      throw new CustomError(`${fnName}: depsNode?.jsonContent == null`)
    }

    if (depsNode.jsonContent.deps == null) {
      // console.log(`${fnName}: no deps in depsNode`)
      return
    }

    // Add to importsData
    for (const [name, minVersionNo] of depsNode.jsonContent.deps) {

      importsData.dependencies[name] = minVersionNo
    }
  }

  async run(prisma: PrismaClient,
            intentCodeProjectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.writeFile()`

    // Get projectSourceNode
    const projectSourceNode = await
            graphQueryService.getProjectSourceNode(
              prisma,
              intentCodeProjectNode)

    // Validate
    if (projectSourceNode == null) {
      throw new CustomError(`${fnName}: projectSourceNode == null`)
    }

    // Get projectSourcePath
    const projectSourcePath = (projectSourceNode.jsonContent as any).path

    // Test for an existing package.json file
    await this.verifyPackageJsonExists(projectSourcePath)

    // Read in the existing file (if available)
    const importsData = await
            readJsTsSourceImportsService.run(
              prisma,
              intentCodeProjectNode,
              projectSourcePath)

    // Get min versions and any potentially missing imports from deps graph
    await this.enrichFromDepsNode(
            prisma,
            intentCodeProjectNode,
            importsData)

    // Update and write the deps file
    await this.updateAndWriteFile(
            prisma,
            importsData)

    // TEST STOP
    throw new CustomError(`${fnName}: TEST STOP`)
  }

  async updateAndWriteFile(
          prisma: PrismaClient,
          importsData: ImportsData) {

    // If the deps file doesn't exist yet, use a hook to create it
    ;

    // Update the deps file content
    ;

    // Write file
    ;
  }

  async verifyPackageJsonExists(projectSourcePath: string) {

    // Define filename
    const filename = `${projectSourcePath}${path.sep}package.json`

    // Check if the file exists
    if (fs.existsSync(filename) === false) {

      console.log(
        `File not found: ${filename}\n` +
        `Please create the initial project in the source directory first.`)

      process.exit(1)
    }
  }
}
