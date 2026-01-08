import fs from 'fs'
import path from 'path'
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { ImportsData } from '@/services/source-code/imports/types'
import { DependenciesQueryService } from '@/services/graphs/dependencies/query-service'
import { ProjectGraphQueryService } from '@/services/graphs/project/query-service'
import { ReadJsTsSourceImportsService } from '@/services/source-code/imports/read-js-ts-service'

// Services
const dependenciesQueryService = new DependenciesQueryService()
const projectGraphQueryService = new ProjectGraphQueryService()
const readJsTsSourceImportsService = new ReadJsTsSourceImportsService()

// Class
export class PackageJsonManagedFileService {

  // Consts
  clName = 'PackageJsonManagedFileService'

  // Code
  async enrichFromDepsNode(
          prisma: PrismaClient,
          projectNode: SourceNode,
          importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.processSrcFile()`

    // Get depsNode
    const depsNode = await
            dependenciesQueryService.getDepsNode(
              prisma,
              projectNode)

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
            projectNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.writeFile()`

    // Get sourceCodeProjectNode
    const sourceCodeProjectNode = await
            projectGraphQueryService.getSourceProjectNode(
              prisma,
              projectNode)

    // Validate
    if (sourceCodeProjectNode == null) {
      throw new CustomError(`${fnName}: sourceCodeProjectNode == null`)
    }

    // Get paths
    const projectPath = (projectNode.jsonContent as any).path
    const projectSourcePath = (sourceCodeProjectNode.jsonContent as any).path

    // Test for an existing package.json file
    await this.verifyPackageJsonExists(projectPath)

    // Read in the existing file (if available)
    const importsData = await
            readJsTsSourceImportsService.run(
              prisma,
              projectNode,
              projectSourcePath)

    // Get min versions and any potentially missing imports from deps graph
    await this.enrichFromDepsNode(
            prisma,
            projectNode,
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

  async verifyPackageJsonExists(projectPath: string) {

    // Define filename
    const filename = `${projectPath}${path.sep}package.json`

    // Check if the file exists
    if (fs.existsSync(filename) === false) {

      console.log(
        `File not found: ${filename}\n` +
        `Please create the initial project directory first.`)

      process.exit(1)
    }
  }
}
