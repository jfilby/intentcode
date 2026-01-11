import fs from 'fs'
import path from 'path'
const semver = require('semver')
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
  enrichFromDepsNode(
    depsNodeJson: any,
    importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.enrichFromDepsNode()`

    // Add to importsData
    for (const [name, minVersionNo] of Object.entries(depsNodeJson.deps)) {

      importsData.dependencies[name] = minVersionNo as string
    }
  }

  async run(prisma: PrismaClient,
            projectNode: SourceNode,
            depsNode: SourceNode) {

    // Debug
    const fnName = `${this.clName}.run()`

    console.log(`${fnName}: starting..`)

    // Validate
    if (projectNode.type !== SourceNodeTypes.project) {

      throw new CustomError(
        `${fnName}: projectNode.type !== SourceNodeTypes.project`)
    }

    // Get sourceCodeProjectNode
    const sourceCodeProjectNode = await
            projectGraphQueryService.getSourceProjectNode(
              prisma,
              projectNode)

    // Validate
    if (sourceCodeProjectNode == null) {
      throw new CustomError(`${fnName}: sourceCodeProjectNode == null`)
    }

    // Validate
    if (depsNode?.jsonContent == null) {
      throw new CustomError(`${fnName}: depsNode?.jsonContent == null`)
    }

    // Get deps
    const depsNodeJson = (depsNode.jsonContent as any)

    if (depsNodeJson == null) {
      // console.log(`${fnName}: no deps in depsNode`)
      return
    }

    // Debug
    console.log(`${fnName}: depsNodeJson: ` + JSON.stringify(depsNodeJson))

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
    this.enrichFromDepsNode(
      depsNodeJson,
      importsData)

    // Update and write the deps file
    await this.updateAndWriteFile(
            depsNodeJson,
            projectPath,
            importsData)
  }

  setIfHigher(
    dependency: string,
    minVersionNo: string,
    target: Record<string, string>) {

    const existing = target[dependency]

    if (!existing) {
      target[dependency] = `^${minVersionNo}`
      return
    }

    const existingMin = semver.minVersion(existing)
    const incomingMin = semver.minVersion(minVersionNo)

    if (
      existingMin &&
      incomingMin &&
      semver.lt(existingMin, incomingMin)
    ) {
      target[dependency] = `^${minVersionNo}`
    }
  }

  async updateAndWriteFile(
          depsNodeJson: any,
          projectPath: string,
          importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.updateAndWriteFile()`

    console.log(`${fnName}: depsNodeJson.runtimes: ` +
                JSON.stringify(depsNodeJson.runtimes))

    // Define filename
    const filename = `${projectPath}${path.sep}package.json`

    // Read the existing package.json
    const content = await fs.readFileSync(filename, 'utf-8')
    const packageJson = JSON.parse(content)

    // Update for runtimes
    if (depsNodeJson.runtimes != null) {

      this.updateForRuntimes(
        packageJson,
        depsNodeJson)
    }

    // Update the dependencies
    this.updateDependencies(
      packageJson,
      importsData)

    // Prettify JSON
    const prettyPackageJson =
            JSON.stringify(
              packageJson,
              null,
              2) +
            `\n`

    // Write file
    await fs.writeFileSync(
            filename,
            prettyPackageJson)
  }

  updateDependencies(
    packageJson: any,
    importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.updateDependencies()`

    // Add dependencies
    for (const [dependency, minVersionNo] of Object.entries(importsData.dependencies)) {

      const deps = packageJson.dependencies ?? {}
      const devDeps = packageJson.devDependencies ?? {}

      const inDependencies = deps[dependency] != null
      const inDevDependencies = devDeps[dependency] != null

      // Helper to safely set or upgrade a version
      if (inDependencies) {
        this.setIfHigher(
          dependency,
          minVersionNo,
          deps)

      } else if (inDevDependencies) {
        this.setIfHigher(
          dependency,
          minVersionNo,
          devDeps)

      } else {
        // New dependency: default to dependencies
        if (!packageJson.dependencies) {
          packageJson.dependencies = {}
        }
        packageJson.dependencies[dependency] = `^${minVersionNo}`
      }
    }
  }

  updateForRuntimes(
    packageJson: any,
    depsNodeJson: any) {

    // Debug
    const fnName = `${this.clName}.updateForRuntimes()`

    // Runtimes
    for (const [runtime, value] of Object.entries(depsNodeJson.runtimes)) {

      const obj = value as any

      if (runtime === 'ts-script') {

        packageJson.scripts['ts-script'] = obj.run
        packageJson.dependencies['ts-node'] = obj.tsNode
      }
    }

    // Debug
    console.log(`${fnName}: post processing: ` + JSON.stringify(packageJson))
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
