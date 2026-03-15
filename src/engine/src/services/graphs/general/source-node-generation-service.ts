import { PrismaClient } from '@/prisma/client.js'
import { SourceNodeGenerationModel } from '@/models/source-graph/source-node-generation-model.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'

// Models
const sourceNodeGenerationModel = new SourceNodeGenerationModel()

// Class
export class SourceNodeGenerationService {

  // Consts
  clName = 'SourceNodeGenerationService'

  // Code
  async deleteOld(
          prisma: PrismaClient,
          sourceNodeId: string) {

    // Get records to keep
    const keepSourceNodeGenerations = await
            sourceNodeGenerationModel.getLatestForSourceNodeId(
              prisma,
              ServerOnlyTypes.keepOldSourceNodeGenerations,
              sourceNodeId)

    // Get ids to keep
    const keepIds =
            keepSourceNodeGenerations.map((keepSourceNodeGeneration: any) =>
              keepSourceNodeGeneration.id)

    // Delete old records
    await sourceNodeGenerationModel.deleteNotInAndSourceNodeId(
            prisma,
            keepIds,
            sourceNodeId)
  }
}
