/**
 * Build the calc example.
 *
 * The example is a real project directory, so it is treated like any other
 * one: its intent.toml is read, the extensions it needs are loaded from the
 * engine's bundled ones, and the build runs. Nothing here is special-cased for
 * the test beyond the path.
 */

import { join } from 'node:path'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { ExtensionQueryService } from
  '../extensions/extension/query-service.js'
import { LoadExternalExtensionsService } from
  '../extensions/extension/load-external-service.js'
import { PathsService } from '../utils/paths-service.js'
import { readProject } from '@/core/project.js'
import { createProjectStore } from '@/core/store.js'
import { ProjectSetupService } from '../projects/setup-project.js'

// Services
const buildMutateService = new BuildMutateService()
const extensionQueryService = new ExtensionQueryService()
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const pathsService = new PathsService()
const projectSetupService = new ProjectSetupService()

export class CalcTestsService {

  clName = 'CalcTestsService'

  /** The extension the example declares it needs. */
  extensions = [`intentcode/nodejs-typescript`]

  async tests() {

    // Debug
    const fnName = `${this.clName}.tests()`

    const projectPath =
      join(pathsService.getExamplesPath(), 'calc')

    // The example is a project like any other: its intent.toml is read from
    // the example directory, and its store is that directory's own.
    const project = await readProject(projectPath)

    const store = createProjectStore(project.path)

    // Install the extensions the example needs, from the ones the engine
    // bundles.
    await loadExternalExtensionsService.loadBundledExtensionsByName(
      store,
      project.id,
      this.extensions)

    await extensionQueryService.checkExtensionsExist(
      store,
      project.id,
      this.extensions)

    await projectSetupService.setupProject(store, project)

    // Recompile the project
    await buildMutateService.runBuild(store, project.id, project.name)

    console.log(`${fnName}: OK`)
  }
}
