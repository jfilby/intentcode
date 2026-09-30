/**
 * The System project.
 *
 * The System project is where the bundled extensions live: every user project
 * inherits from it, and it is the only project the engine seeds without being
 * asked. It is not a project the user owns, so it has no directory of its own
 * and nothing is ever written beside the engine.
 *
 * The two halves of it are kept apart on purpose. Its `path` is the engine
 * directory, because that is where `bundled/` is read from, and the engine
 * directory is a package root that must stay as it was installed. Its state is
 * the per-user application directory instead, which is where the database
 * lived before the file store, so an upgrade keeps the user's data.
 */

import { getUserAppDir } from '@/core/json-store.js'
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

/** The System project's store, kept in the user's application directory. */
export function getSystemStore(): ProjectStore {

  return createProjectStore(getUserAppDir())
}
