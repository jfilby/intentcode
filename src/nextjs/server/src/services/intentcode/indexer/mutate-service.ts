import { PrismaClient } from '@prisma/client'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir'

// Services
const walkDirService = new WalkDirService()

// Class
export class IntentCodeMutateIndexer {

  // Consts
  clName = 'IntentCodeMutateIndexer'

  // Code
  async analyzeFile(
          prisma: PrismaClient,
          intentCodeFilename: string) {

    ;
  }

  async indexProject(
          prisma: PrismaClient,
          path: string) {

    // Walk dir
    var intentCodeList: string[] = []

    await walkDirService.walkDir(
            `${path}/intent`,
            intentCodeList)

    // Analyze each file
    for (const intentCodeFilename of intentCodeList) {

      await this.analyzeFile(
              prisma,
              intentCodeFilename)
    }
  }
}
