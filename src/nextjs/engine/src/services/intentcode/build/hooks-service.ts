import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildData } from '@/types/build-types'

export class BuildHooksService {

  // Consts
  clName = 'BuildHooksService'

  // Code
  async updateDeps(
          prisma: PrismaClient,
          projectIntentCodeNode: SourceNode,
          buildData: BuildData) {

    // Update deps file
    ;

    // Run the update deps hook
    ;
  }
}
