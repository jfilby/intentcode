/**
 * Build the bundled calc example.
 *
 * The example is a real project directory, so it is treated like any other
 * one: its intent.toml is read, the extensions it needs are copied in from
 * the System project, and the build runs. Nothing here is special-cased for
 * the test beyond the path.
 */

import { join } from 'node:path'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { ExtensionMutateService } from '../extensions/extension/mutate-service.js'
import { ExtensionQueryService } from '../extensions/extension/query-service.js'
import { PathsService } from '../utils/paths-service.js'
import { getSystemStore } from '../projects/system-project.js'
import { readProject } from '@/core/project.js'
import { createProjectStore } from '@/core/store.js'
import { ProjectSetupService } from '../projects/setup-project.js'

// Services
const buildMutateService = new BuildMutateService()
const extensionMutateService = new ExtensionMutateService()
const extensionQueryService = new ExtensionQueryService()
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
      join(pathsService.getBundledPath(), 'examples', 'calc')

    // The example is a project like any other: its intent.toml is read from
    // the example directory, and its store is that directory's own.
    const project = await readProject(projectPath)

    const store = createProjectStore(project.path)

    // Install the extensions the example needs, from the System project that
    // holds the bundled ones.
    const systemStore = getSystemStore()

    await extensionMutateService.loadExtensionsInSystemToUserProject(
      systemStore,
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
