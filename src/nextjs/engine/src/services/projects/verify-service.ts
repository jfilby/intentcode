import { PrismaClient, SourceNode } from '@prisma/client'
import { DepsJsonService } from '../managed-files/deps/deps-json-service'

// Services
const depsJsonService = new DepsJsonService()

// Class
export class ProjectVerifyService {

  // Consts
  clName = 'ProjectVerifyService'

  // Code
  async run(prisma: PrismaClient,
            projectNode: SourceNode) {

    // Verify depsNode matches deps.json
    await depsJsonService.verifyDepsNodeSyncedToDepsJson(
            prisma,
            projectNode)
  }
}
