import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildData } from '@/types/build-types'
import { DepsVerifyService } from '../managed-files/deps/verify-service'
import { TechStackVerifyService } from '../intentcode/tech-stack/verify-service'

// Services
const depsVerifyService = new DepsVerifyService()
const techStackVerifyService = new TechStackVerifyService()

// Class
export class ProjectVerifyService {

  // Consts
  clName = 'ProjectVerifyService'

  // Code
  async run(
    prisma: PrismaClient,
    buildData: BuildData,
    projectNode: SourceNode) {

    // Verify depsNode
    await depsVerifyService.verifyDepsNode(
      prisma,
      projectNode)

    // Verify tech-stack.md
    await techStackVerifyService.verify(
      prisma,
      buildData,
      projectNode)
  }
}
