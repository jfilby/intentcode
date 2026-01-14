import { PrismaClient, SourceNode } from '@prisma/client'

export class SpecsToIntentCodeMutateService {

  // Consts
  clName = 'SpecsToIntentCodeMutateService'

  // Code
  async run(prisma: PrismaClient,
            projectNode: SourceNode) {

    console.log(`Compiling specs to IntentCode..`)
    console.log(`To be implemented..`)
  }
}
