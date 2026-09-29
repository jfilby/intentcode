import fs from 'fs'
import https from 'node:https'
import path from 'path'
import semver from 'semver'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'
import { BuildData } from '@/types/build-types.js'
import { ProjectDetails, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { ImportsData } from '@/services/source-code/imports/types.js'
import { ReadJsTsSourceImportsService } from '@/services/source-code/imports/read-js-ts-service.js'

// Services
const readJsTsSourceImportsService = new ReadJsTsSourceImportsService()

// Class
export class PackageJsonFileMutateService {

  // Consts
  clName = 'PackageJsonFileMutateService'
  ignoredDependencies = [
    'nodejs'
  ]

  ignoredDependencyPrefixes = [
    'node:',
    'nodejs:'
  ]

  latest = 'latest'

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

  /**
   * The build's details for a project. A build holds every project it covers,
   * keyed by number, so the project is found by the id on the node rather
   * than by the number: the caller has a node, not a number.
   */
  private getBuildProjectDetails(
          buildData: BuildData,
          projectId: string): ProjectDetails {

    // Debug
    const fnName = `${this.clName}.getBuildProjectDetails()`

    for (const projectDetails of Object.values(buildData.projects)) {

      if (projectDetails.project.id === projectId) {
        return projectDetails
      }
    }

    throw new IntentError({
      category: 'CompilerError',
      stage: fnName,
      message: `no ProjectDetails in the build for projectId: ${projectId}`
    })
  }

  // Code
  enrichFromDepsNode(
    depsNodeJson: any,
    importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.enrichFromDepsNode()`

    // Validate
    if (depsNodeJson.source?.deps == null) {
      return
    }

    // Add to importsData
    for (const [name, minVersionNo] of Object.entries(depsNodeJson.source.deps)) {

      importsData.dependencies[name] = minVersionNo as string
    }
  }

  async fixDependencies(packageJson: any) {

    // Iterate dependencies
    if (packageJson.dependencies != null) {
      await this.fixDependencyEntries(packageJson.dependencies)
    }

    if (packageJson.devDependencies != null) {
      await this.fixDependencyEntries(packageJson.devDependencies)
    }
  }

  async fixDependencyEntries(dependencies: any) {

    for (var [dependency, minVersionNo] of Object.entries(dependencies)) {

      // Remove ignored dependencies
      if (this.isIgnoredDependency(dependency)) {
        dependencies[dependency] = undefined
        continue
      }

      // A dist-tag or other non-semver specifier ('latest', 'next', a git URL,
      // 'file:..') has to be resolved against the registry. The previous test
      // was /[^0-9^]/, which matched the dots in an ordinary pin like '4.1.2',
      // so every pinned dependency was rewritten to ^<latestMajor> on every
      // build, silently upgrading users across major versions.
      if (semver.validRange(minVersionNo as string) == null) {
        minVersionNo = this.latest
      }

      // Get latest dependencies
      if ((minVersionNo as string).endsWith(this.latest)) {

        // Get latest version
        var latestVersionNo = await
          this.getLatestVersion(dependency)

        // Use the major version only
        const latestMajorVersionNo = semver.major(latestVersionNo)

        // Set the dependency
        dependencies[dependency] = `^${latestMajorVersionNo}`
      }
    }
  }

  getNumericOnlyVersionNo(versionNo: string) {

    // Debug
    const fnName = `${this.clName}.getCleanVersionNo()`

    // Validate
    if (versionNo == null ||
        versionNo.length === 0) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `invalid versionNo: ${versionNo}`
      })
    }

    // Remove leading caret if present
    if (versionNo[0] === '^') {
      return versionNo.substring(1)
    }

    // Valid as is
    return versionNo
  }

  async getLatestVersion(pkgName: string) {

    return new Promise<string>((resolve, reject) => {
      const url = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`

      https.get(url, res => {
        let data = '';

        if (res.statusCode !== 200) {
          res.resume()  // drain stream
          return reject(
            new Error(`npm registry error: ${res.statusCode}`)
          );
        }

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json['dist-tags'].latest);
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject)
    })
  }

  isIgnoredDependency(dependency: string) {

    // Check list of ignored dependencies
    if (this.ignoredDependencies.includes(dependency)) {
      return true
    }

    // Check ignored prefixes
    for (const ignoredDependencyPrefix of this.ignoredDependencyPrefixes) {

      if (dependency.startsWith(ignoredDependencyPrefix)) {
        return true
      }
    }

    // OK (not ignored)
    return false
  }

  normalizeSemVer(v: string) {

    // Debug
    const fnName = `${this.clName}.normalizeSemVer()`

    // console.log(`${fnName}: v: ${v}`)

    // Remove non-numeric chars
    v = this.getNumericOnlyVersionNo(v)

    // Debug
    // console.log(`${fnName}: v: ${v}`)

    // E.g. 5 -> 5.0.0. The non-null assertion was load-bearing only because
    // callers guaranteed a numeric version; a dist-tag slipped through and
    // produced null, which then surfaced much later as
    // "Invalid Version: null" from semver.minVersion().
    const normalized = semver.valid(v) ?? semver.valid(semver.coerce(v))

    if (normalized == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `invalid version: ${v}`
      })
    }

    v = normalized

    // Debug
    // console.log(`${fnName}: v: ${v}`)

    // Return
    return v
  }

  async run(store: ProjectStore,
            buildData: BuildData,
            projectNode: SourceNodeRecord,
            depsNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.run()`

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: starting..`)
    }

    // Validate
    if (projectNode.type !== SourceNodeTypes.project) {

      throw new IntentError({
        category: 'CompilerError',
        stage: fnName,
        message: 'projectNode.type !== SourceNodeTypes.project'
      })
    }

    // Get ProjectDetails
    const projectDetails = this.getBuildProjectDetails(
      buildData,
      projectNode.projectId)

    // Validate
    var depsNodeJson: any = null

    if (depsNode?.jsonContent != null) {
      depsNodeJson = (depsNode.jsonContent as any)
    }

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: depsNodeJson: ` + JSON.stringify(depsNodeJson))
    }

    // Get paths
    const projectPath = (projectNode.jsonContent as any).path

    const projectSourcePath =
      (projectDetails.projectSourceNode.jsonContent as any).path

    // Test for an existing package.json file
    await this.verifyPackageJsonExists(projectPath)

    // Read in the existing file (if available)
    const importsData = await
            readJsTsSourceImportsService.run(
              store,
              projectNode,
              projectSourcePath)

    // Get min versions and any potentially missing imports from deps graph
    if (depsNodeJson?.source?.deps != null) {

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
    latestVersionNo: string,
    target: Record<string, string>) {

    // Debug
    const fnName = `${this.clName}.setIfHigher()`

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: minVersionNo: ${minVersionNo}`)
      console.log(`${fnName}: latestVersionNo: ${latestVersionNo}`)
    }

    // Check for existing dependency
    var existing = target[dependency]

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: existing: ${existing}`)
    }

    // Set and return if no existing dpendency
    if (!existing) {

      target[dependency] = minVersionNo
      return

    } else if (existing.endsWith(this.latest)) {
      existing = latestVersionNo
    }

    // Get numeric-only version numbers for comparisons
    const numericExisting = this.normalizeSemVer(existing)
    const numericMinVersionNo = this.normalizeSemVer(minVersionNo)

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: numericExisting: ${numericExisting}`)
      console.log(`${fnName}: numericMinVersionNo: ${numericMinVersionNo}`)
    }

    // Add a new dependency
    const existingMin = semver.minVersion(numericExisting)
    const incomingMin = semver.minVersion(numericMinVersionNo)

    if (existingMin &&
        incomingMin &&
        semver.lt(existingMin, incomingMin)) {

      target[dependency] = `^${numericMinVersionNo}`
    }
  }

  async updateAndWriteFile(
          depsNodeJson: any,
          projectPath: string,
          importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.updateAndWriteFile()`

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: depsNodeJsonsource.source.runtimes: ` +
        JSON.stringify(depsNodeJson.source.runtimes))
    }

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
    await this.updateDependencies(
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

  async updateDependencies(
    packageJson: any,
    importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.updateDependencies()`

    // Fix existing dependencies if needed
    await this.fixDependencies(packageJson)

    // Add dependencies
    for (var [dependency, minVersionNo] of Object.entries(importsData.dependencies)) {

      // Ignore certain dependencies
      if (this.isIgnoredDependency(dependency)) {
        continue
      }

      // Get clean version numbers for comparisons
      var numericMinVersionNo = this.getNumericOnlyVersionNo(minVersionNo)

      // Get dependencies / devDependencies
      const deps = packageJson.dependencies ?? {}
      const devDeps = packageJson.devDependencies ?? {}

      const inDependencies = deps[dependency] != null
      const inDevDependencies = devDeps[dependency] != null

      // Get latest version?
      if (minVersionNo.endsWith(this.latest)) {

        // Debug
        if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
          console.log(`${fnName}: getting latest version of: ${dependency}`)
        }

        // Get latest version
        const latestVersionNo = await
          this.getLatestVersion(dependency)

        // Debug
        if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
          console.log(`${fnName}: latestVersionNo: ${latestVersionNo}`)
        }

        // If available, set the latest major version. This must assign the
        // loop's minVersionNo, not a block-scoped shadow of it: the old
        // `const minVersionNo = ...` left the caller passing the literal
        // string 'latest' into setIfHigher(), where normalizeSemVer() produced
        // null and semver.minVersion(null) threw, killing the build.
        if (latestVersionNo != null) {

          const latestMajorVersionNo = semver.major(latestVersionNo)

          minVersionNo = `${latestMajorVersionNo}`
          numericMinVersionNo =
            this.getNumericOnlyVersionNo(minVersionNo)
        }

        // Debug
        // console.log(`${fnName}: minVersionNo: ${minVersionNo}`)
        // console.log(`${fnName}: numericMinVersionNo: ${numericMinVersionNo}`)
      }

      // Helper to safely set or upgrade a version
      if (inDependencies) {
        this.setIfHigher(
          dependency,
          minVersionNo,
          minVersionNo,  // latest
          deps)

      } else if (inDevDependencies) {
        this.setIfHigher(
          dependency,
          minVersionNo,
          minVersionNo,  // latest
          devDeps)

      } else {
        // New dependency: default to dependencies
        if (!packageJson.dependencies) {
          packageJson.dependencies = {}
        }

        packageJson.dependencies[dependency] = `^${numericMinVersionNo}`
      }
    }
  }

  updateForRuntimes(
    packageJson: any,
    tsConfigJson: any,
    depsNodeJson: any) {

    // Debug
    const fnName = `${this.clName}.updateForRuntimes()`

    // Validate
    if (depsNodeJson.source?.runtimes == null) {
      return
    }

    // Runtimes
    for (const [runtime, value] of Object.entries(depsNodeJson.source.runtimes)) {

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
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: post processing: ` + JSON.stringify(packageJson))
    }
  }

  async verifyPackageJsonExists(projectPath: string) {

    // Define filename
    const filename = `${projectPath}${path.sep}package.json`

    // Check if the file exists
    if (fs.existsSync(filename) === false) {

      console.log(
        `File not found: ${filename}\n` +
        `Please create the initial project files first.`)

      process.exit(1)
    }
  }
}
