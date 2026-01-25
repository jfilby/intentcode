import { PrismaClient, SourceNode } from '@prisma/client'
import { DepsVerifyService } from '../managed-files/deps/verify-service'

// Services
const depsVerifyService = new DepsVerifyService()

// Class
export class ProjectVerifyService {

  // Consts
  clName = 'ProjectVerifyService'

  // Code
  async run(prisma: PrismaClient,
            projectNode: SourceNode) {

    // Verify depsNode
    await depsVerifyService.verifyDepsNode(
      prisma,
      projectNode)
  }
}
