/**
 * The System project.
 *
 * The engine directory is a project of its own: it holds the bundled
 * extensions every project inherits from, and it is the only one not named by
 * an intent.toml, because it is not the user's to build. It is a fact about
 * where the engine is installed rather than something a command supplies.
 */

import type { ProjectRecord } from '@/core/records.js'
import { createProjectStore, type ProjectStore } from '@/core/store.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'
import { PathsService } from '../utils/paths-service.js'

// Services
const pathsService = new PathsService()

/** The System project record: the engine directory, never built. */
export function getSystemProject(): ProjectRecord {

  return {
    id: ServerOnlyTypes.systemProjectId,
    name: ServerOnlyTypes.systemProjectName,
    key: ServerOnlyTypes.systemProjectId,
    path: pathsService.getEnginePath(),
    isSystem: true,
    status: 'A',
    created: new Date(0).toISOString(),
    updated: new Date(0).toISOString()
  }
}

/** The System project's store, which is beside the engine rather than under it. */
export function getSystemStore(): ProjectStore {

  return createProjectStore(pathsService.getEnginePath())
}
