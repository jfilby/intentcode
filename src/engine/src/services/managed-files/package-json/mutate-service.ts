import fs from 'fs'
import https from 'node:https'
import path from 'path'
import semver from 'semver'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { DepsData, SourceNodeTypes } from '@/types/source-graph-types.js'
import { BuildData } from '@/types/build-types.js'
import { ProjectDetails, ServerOnlyTypes, VerbosityLevels } from '@/types/server-only-types.js'
import { ImportsData } from '@/services/source-code/imports/types.js'
import { ReadJsTsSourceImportsService } from '@/services/source-code/imports/read-js-ts-service.js'

// Services
const readJsTsSourceImportsService = new ReadJsTsSourceImportsService()

/**
 * The parts of a `package.json` / `tsconfig.json` this service edits. A
 * hand-written manifest is not required to carry any of them, so every field
 * is optional and is created before it is written to.
 */
interface PackageJson {
  name?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

/** The part of a project's node jsonContent this service reads. */
type ProjectNodeContent = {
  path: string
}

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
    depsNodeJson: DepsData,
    importsData: ImportsData) {

    // Validate
    if (depsNodeJson.source?.deps == null) {
      return
    }

    // Add to importsData
    for (const [name, minVersionNo] of Object.entries(depsNodeJson.source.deps)) {

      importsData.dependencies[name] = minVersionNo as string
    }
  }

  async fixDependencies(packageJson: PackageJson) {

    // Iterate dependencies
    if (packageJson.dependencies != null) {
      await this.fixDependencyEntries(packageJson.dependencies)
    }

    if (packageJson.devDependencies != null) {
      await this.fixDependencyEntries(packageJson.devDependencies)
    }
  }

  async fixDependencyEntries(dependencies: Record<string, string | undefined>) {

    for (const [dependency, minVersion] of Object.entries(dependencies)) {

      // Mutable: a non-semver specifier below is replaced with `latest`.
      let minVersionNo = minVersion

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
        const latestVersionNo = await
          this.getLatestVersion(dependency)

        // Use the major version only
        const latestMajorVersionNo = semver.major(latestVersionNo)

        // Set the dependency
        dependencies[dependency] = `^${latestMajorVersionNo}`
      }
    }
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

    // A min version is a range, not always a pin: the tech stack a project
    // reports can ask for '*' or '>=16' as readily as '5.0.0'. Comparing the
    // floor of the range is what makes those comparable, and it answers all
    // three correctly — '*' floors at 0.0.0 and so never upgrades an existing
    // pin, '>=16' at 16.0.0, a bare '5' at 5.0.0. valid() plus coerce(),
    // which this replaces, only read a pin and threw on a wildcard, which
    // killed the build on any project whose tech stack named one.
    const range = typeof v === 'string' ? semver.validRange(v) : null
    const floor = range == null ? null : semver.minVersion(range)

    if (floor == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: `invalid version: ${v}`
      })
    }

    return floor.version
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

    // Validate. The node is created empty, so a project that has declared no
    // dependencies has no content yet; an absent deps node is an empty one.
    const depsNodeJson: DepsData = (depsNode?.jsonContent as DepsData) ?? {}

    // Debug
    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {
      console.log(`${fnName}: depsNodeJson: ` + JSON.stringify(depsNodeJson))
    }

    // Get paths
    const projectPath = (projectNode.jsonContent as ProjectNodeContent).path

    const projectSourcePath =
      (projectDetails.projectSourceNode.jsonContent as ProjectNodeContent).path

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
    let existing = target[dependency]

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
          depsNodeJson: DepsData,
          projectPath: string,
          importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.updateAndWriteFile()`

    if (ServerOnlyTypes.verbosity >= VerbosityLevels.max) {

      console.log(`${fnName}: depsNodeJson.runtimes: ` +
        JSON.stringify(depsNodeJson?.runtimes))
    }

    // Define filenames
    const packageJsonFilename = `${projectPath}${path.sep}package.json`
    const tsConfigJsonFilename = `${projectPath}${path.sep}tsconfig.json`

    // Read the existing package.json
    const packageJsonContent = await
            fs.readFileSync(packageJsonFilename, 'utf-8')

    const packageJson = JSON.parse(packageJsonContent) as PackageJson

    // Read the existing tsconfig.json (if present)
    let tsConfigJson: PackageJson | undefined = undefined

    if (await fs.existsSync(tsConfigJsonFilename) === true) {

      const tsConfigJsonContent = await
              fs.readFileSync(tsConfigJsonFilename, 'utf-8')

      tsConfigJson = JSON.parse(tsConfigJsonContent) as PackageJson
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
    packageJson: PackageJson,
    importsData: ImportsData) {

    // Debug
    const fnName = `${this.clName}.updateDependencies()`

    // Fix existing dependencies if needed
    await this.fixDependencies(packageJson)

    // Add dependencies
    for (const [dependency, minVersion] of
           Object.entries(importsData.dependencies)) {

      // Mutable: the latest major is assigned to it below.
      let minVersionNo = minVersion

      // Ignore certain dependencies
      if (this.isIgnoredDependency(dependency)) {
        continue
      }

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

        // A min version that admits anything has a floor of 0.0.0, and no
        // version below every real release is a useful pin, so such a
        // specifier is written as it stands rather than with a caret off a
        // floor nothing asked for.
        const floor = this.normalizeSemVer(minVersionNo)
        packageJson.dependencies[dependency] =
          semver.eq(floor, '0.0.0') ? '*' : `^${floor}`
      }
    }
  }

  updateForRuntimes(
    packageJson: PackageJson,
    tsConfigJson: PackageJson | undefined,
    depsNodeJson: DepsData) {

    // Debug
    const fnName = `${this.clName}.updateForRuntimes()`

    // `runtimes` is a top-level key of the deps node: the schema in
    // deps-json-service, DepsData and the gate in updateAndWriteFile all say
    // so. This read `depsNodeJson.source.runtimes`, which no deps file can
    // ever carry, so the whole body was unreachable — and it was reached by
    // nothing that would have caught the unguarded dereferences inside it.
    if (depsNodeJson?.runtimes == null) {
      return
    }

    // Runtimes
    for (const [runtime, obj] of Object.entries(depsNodeJson.runtimes)) {

      // A runtime entry is a map of tool names to what to add; one with
      // nothing in it configures nothing.
      if (obj == null) continue

      // ts-script
      if (runtime !== this.tsScript) continue

      // Every one of these is optional in a hand-written package.json: a
      // project with no `scripts`, no `dependencies` or no `devDependencies`
      // is ordinary, and writing through a missing one threw a TypeError
      // that took the build down rather than adding the key.
      if (packageJson.scripts == null) packageJson.scripts = {}
      if (packageJson.dependencies == null) packageJson.dependencies = {}
      if (packageJson.devDependencies == null) {
        packageJson.devDependencies = {}
      }

      // package.json modifications
      packageJson.scripts[this.tsScript] = `ts-node ${obj.run}`

      // ts-node is a build-time tool, so it belongs with the dev
      // dependencies rather than the ones a project ships.
      if (obj[this.tsNode] != null) {
        packageJson.devDependencies[this.tsNode] = obj[this.tsNode]
      }

      if (packageJson.dependencies[this.tsConfigPaths] == null &&
          packageJson.devDependencies[this.tsConfigPaths] == null) {

        packageJson.devDependencies[this.tsConfigPaths] =
          this.tsConfigPathsMinVersionNo
      }

      // tsconfig.json modifications. A project with no tsconfig.json has
      // nothing to configure, and one is not invented here.
      if (tsConfigJson != null) {
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
