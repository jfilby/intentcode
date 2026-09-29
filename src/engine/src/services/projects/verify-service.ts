import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BuildData } from '@/types/build-types.js'
import { DepsVerifyService } from '../managed-files/deps/verify-service.js'
import { TechStackVerifyService } from '../intentcode/tech-stack/verify-service.js'

// Services
const depsVerifyService = new DepsVerifyService()
const techStackVerifyService = new TechStackVerifyService()

// Class
export class ProjectVerifyService {

  // Consts
  clName = 'ProjectVerifyService'

  // Code
  async run(
    store: ProjectStore,
    buildData: BuildData,
    projectNode: SourceNodeRecord) {

    // Verify depsNode
    await depsVerifyService.verifyDepsNode(
      store,
      projectNode)

    // Verify tech-stack.md
    await techStackVerifyService.verify(
      store,
      buildData,
      projectNode)
  }
}
