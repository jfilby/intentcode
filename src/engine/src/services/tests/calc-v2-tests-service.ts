/**
 * Build the calc-v2 example.
 *
 * The same end-to-end build as the calc example, against a project that
 * declares no extensions of its own: it is the case where the engine has to
 * work out what the project needs rather than being told.
 */

import { join } from 'node:path'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { PathsService } from '../utils/paths-service.js'
import { readProject } from '@/core/project.js'
import { createProjectStore } from '@/core/store.js'
import { ProjectSetupService } from '../projects/setup-project.js'

// Services
const buildMutateService = new BuildMutateService()
const pathsService = new PathsService()
const projectSetupService = new ProjectSetupService()

export class CalcV2TestsService {

  clName = 'CalcV2TestsService'

  async tests() {

    // Debug
    const fnName = `${this.clName}.tests()`

    const projectPath =
      join(pathsService.getExamplesPath(), 'calc-v2')

    // The example is a project like any other: its intent.toml is read from
    // the example directory, and its store is that directory's own.
    const project = await readProject(projectPath)

    const store = createProjectStore(project.path)

    await projectSetupService.setupProject(store, project)

    await buildMutateService.runBuild(store, project.id, project.name)

    console.log(`${fnName}: OK`)
  }
}
