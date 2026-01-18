import fs from 'fs'
import path from 'path'
const semver = require('semver')
import { PrismaClient, SourceNode } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SourceNodeTypes } from '@/types/source-graph-types'
import { ImportsData } from '@/services/source-code/imports/types'
import { ProjectGraphQueryService } from '@/services/graphs/project/query-service'
import { ReadJsTsSourceImportsService } from '@/services/source-code/imports/read-js-ts-service'

// Services
const projectGraphQueryService = new ProjectGraphQueryService()
const readJsTsSourceImportsService = new ReadJsTsSourceImportsService()

// Class
export class PackageJsonManagedFileService {

  // Consts
  clName = 'PackageJsonManagedFileService'

  tsConfigPaths = 'tsconfig-paths'
  tsConfigPathsMinVersionNo = '^4'

  tsNode = 'ts-node'
  tsScript = 'ts-script'

  tsConfigJsonTsNode = {
    'require': ['tsconfig-paths/register'],
      'compilerOptions': {
        'module': 'CommonJS'
      }
    }

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

    // Get projectSourceCodeNode
    const projectSourceCodeNode = await
            projectGraphQueryService.getSourceProjectNode(
              prisma,
              projectNode)

    // Validate
    if (projectSourceCodeNode == null) {
      throw new CustomError(`${fnName}: projectSourceCodeNode == null`)
    }

    // Validate
    var depsNodeJson: any = null

    if (depsNode?.jsonContent != null) {
      depsNodeJson = (depsNode.jsonContent as any)
    }

    // Debug
    console.log(`${fnName}: depsNodeJson: ` + JSON.stringify(depsNodeJson))

    // Get paths
    const projectPath = (projectNode.jsonContent as any).path
    const projectSourcePath = (projectSourceCodeNode.jsonContent as any).path

    // Test for an existing package.json file
    await this.verifyPackageJsonExists(projectPath)

    // Read in the existing file (if available)
    const importsData = await
            readJsTsSourceImportsService.run(
              prisma,
              projectNode,
              projectSourcePath)

    // Get min versions and any potentially missing imports from deps graph
    if (depsNodeJson?.deps != null) {

      this.enrichFromDepsNode(
        depsNodeJson,
        importsData)
    }

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

    // Define filenames
    const packageJsonFilename = `${projectPath}${path.sep}package.json`
    const tsConfigJsonFilename = `${projectPath}${path.sep}tsconfig.json`

    // Read the existing package.json
    const packageJsonContent = await
            fs.readFileSync(packageJsonFilename, 'utf-8')

    const packageJson = JSON.parse(packageJsonContent)

    // Read the existing tsconfig.json (if present)
    var tsConfigJson: any = undefined

    if (await fs.existsSync(tsConfigJsonFilename) === true) {

      const tsConfigJsonContent = await
              fs.readFileSync(tsConfigJsonFilename, 'utf-8')

      tsConfigJson = JSON.parse(tsConfigJsonContent)
    }

    // Update for runtimes
    if (depsNodeJson?.runtimes != null) {

      this.updateForRuntimes(
        packageJson,
        tsConfigJson,
        depsNodeJson)
    }

    // Update the dependencies
    this.updateDependencies(
      packageJson,
      importsData)

    // Prettify packageJson
    const prettyPackageJson =
            JSON.stringify(
              packageJson,
              null,
              2) +
            `\n`

    // Write files
    await fs.writeFileSync(
            packageJsonFilename,
            prettyPackageJson)

    if (tsConfigJson != null) {

      const prettyTsConfigJson =
              JSON.stringify(
                tsConfigJson,
                null,
                2) +
              `\n`

      await fs.writeFileSync(
              tsConfigJsonFilename,
              prettyTsConfigJson)
    }
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
    tsConfigJson: any,
    depsNodeJson: any) {

    // Debug
    const fnName = `${this.clName}.updateForRuntimes()`

    // Runtimes
    for (const [runtime, value] of Object.entries(depsNodeJson.runtimes)) {

      const obj = value as any

      // ts-script
      if (runtime === this.tsScript) {

        // package.json modifications
        packageJson.scripts[this.tsScript] = `ts-node ${obj.run}`
        packageJson.dependencies[this.tsNode] = obj[this.tsNode]

        if (packageJson.dependencies[this.tsConfigPaths] == null &&
            packageJson.devDependencies[this.tsConfigPaths] == null) {

          packageJson.dependencies[this.tsConfigPaths] =
            this.tsConfigPathsMinVersionNo
        }

        // tsconfig.json modifications
        tsConfigJson[this.tsNode] = this.tsConfigJsonTsNode
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
