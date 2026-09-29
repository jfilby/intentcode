/**
 * Build the bundled calc example.
 *
 * The example is a real project directory, so it is created the same way any
 * project is: an intent.toml is written if it has none, the extensions it
 * needs are copied in from the System project, and the build runs. Nothing
 * here is special-cased for the test beyond the path.
 */

import { join } from 'node:path'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { ExtensionMutateService } from '../extensions/extension/mutate-service.js'
import { ExtensionQueryService } from '../extensions/extension/query-service.js'
import { PathsService } from '../utils/paths-service.js'
import { ProjectRegistryService } from '../projects/project-registry.js'

// Services
const buildMutateService = new BuildMutateService()
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
const pathsService = new PathsService()
const projectRegistryService = new ProjectRegistryService()

export class CalcTestsService {

  clName = 'CalcTestsService'

  /** The extension the example declares it needs. */
  extensions = [`intentcode/nodejs-typescript`]

  async tests() {

    // Debug
    const fnName = `${this.clName}.tests()`

    const projectPath =
      join(pathsService.getBundledPath(), 'examples', 'calc')

    // The example is a project like any other: writing its intent.toml makes
    // it one, and reading it back gives the id the rest of the test uses.
    const project = await projectRegistryService.createProject(
      projectPath, 'calc')

    const store = projectRegistryService.getStore(project)

    // Install the extensions the example needs, from the System project that
    // holds the bundled ones.
    const system = projectRegistryService.getSystemProject()
    const systemStore = projectRegistryService.getStore(system)

    await extensionMutateService.loadExtensionsInSystemToUserProject(
      systemStore,
      store,
      project.id,
      this.extensions)

    await extensionQueryService.checkExtensionsExist(
      store,
      project.id,
      this.extensions)

    // Recompile the project
    await buildMutateService.runBuild(store, project.id, project.name)

    console.log(`${fnName}: OK`)
  }
}
