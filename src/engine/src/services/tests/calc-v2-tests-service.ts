/**
 * Build the bundled calc-v2 example.
 *
 * The same end-to-end build as the calc example, against a project that
 * declares no extensions of its own: it is the case where the engine has to
 * work out what the project needs rather than being told.
 */

import { join } from 'node:path'
import { BuildMutateService } from '../intentcode/build/mutate-service.js'
import { PathsService } from '../utils/paths-service.js'
import { ProjectRegistryService } from '../projects/project-registry.js'

// Services
const buildMutateService = new BuildMutateService()
const pathsService = new PathsService()
const projectRegistryService = new ProjectRegistryService()

export class CalcV2TestsService {

  clName = 'CalcV2TestsService'

  async tests() {

    // Debug
    const fnName = `${this.clName}.tests()`

    const projectPath =
      join(pathsService.getBundledPath(), 'examples', 'calc-v2')

    const project = await projectRegistryService.createProject(
      projectPath, 'calc-v2')

    const store = projectRegistryService.getStore(project)

    await buildMutateService.runBuild(store, project.id, project.name)

    console.log(`${fnName}: OK`)
  }
}
