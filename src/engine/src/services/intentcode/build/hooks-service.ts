import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BuildData } from '@/types/build-types.js'

export class BuildHooksService {

  // Consts
  clName = 'BuildHooksService'

  // Code
  async updateDeps(
          store: ProjectStore,
          projectIntentCodeNode: SourceNodeRecord,
          buildData: BuildData) {

    // Update deps file
    ;

    // Run the update deps hook
    ;
  }
}
