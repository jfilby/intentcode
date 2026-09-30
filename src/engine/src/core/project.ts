/**
 * The project a command runs against.
 *
 * A project is the directory holding an `intent.toml`, and reading that file
 * is the whole of resolving one.
 */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { getAsKey } from './field-naming.js'
import { IntentError } from './errors.js'
import { readProjectConfig } from './project-config.js'
import type { ProjectRecord } from './records.js'
import { PROJECT_CONFIG_FILE } from './store.js'

/**
 * The project in a directory: its intent.toml read back as a record. The file
 * has to be there — a directory without one is not a project. A file that is
 * there but unreadable as a config is the same failure, and says what is
 * wrong with it.
 */
export async function readProject(
  dir: string = process.cwd()
): Promise<ProjectRecord> {

  const path = resolve(dir)

  if (existsSync(join(path, PROJECT_CONFIG_FILE)) === false) {

    throw new IntentError({
      category: 'ProjectError',
      stage: 'readProject',
      message: `no ${PROJECT_CONFIG_FILE} in ${path}`,
      detail: `a project is the directory holding an ${PROJECT_CONFIG_FILE}, ` +
        `so run this from a project directory`
    })
  }

  // The record is read back out of the file rather than assembled next to it,
  // so the two cannot disagree about what the project is.
  const config = await readProjectConfig(path)
  const key = config.key ?? getAsKey(config.name)
  const now = new Date().toISOString()

  return {
    id: key,
    name: config.name,
    key,
    path,
    isSystem: false,
    status: 'A',
    created: now,
    updated: now
  }
}
