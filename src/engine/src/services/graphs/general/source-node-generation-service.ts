import type { ProjectStore } from '@/core/store.js'
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
          store: ProjectStore,
          sourceNodeId: string) {

    // Get records to keep
    const keepSourceNodeGenerations = await
            sourceNodeGenerationModel.getLatestForSourceNodeId(
              store,
              ServerOnlyTypes.keepOldSourceNodeGenerations,
              sourceNodeId)

    // Get ids to keep
    const keepIds =
      keepSourceNodeGenerations.map((generation) => generation.id)

    // Delete old records
    await sourceNodeGenerationModel.deleteNotInAndSourceNodeId(
            store,
            keepIds,
            sourceNodeId)
  }
}
