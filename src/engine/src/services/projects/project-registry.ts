/**
 * The projects the engine knows about.
 *
 * A project is a directory holding an `intent.toml`. There is no table of
 * them: a directory becomes a project by having the file, and the engine
 * finds it by walking up from the working directory, so running the compiler
 * anywhere inside a project binds to that project without being told where it
 * is.
 *
 * The System project is the one exception. It has no intent.toml of its own
 * and is never built; it is the engine directory, and it holds the graph the
 * bundled extensions are read from. It is a pseudo-project so that a project
 * can be copied from it the same way as from any other.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { getAsKey } from '@/core/field-naming.js'
import {
  findProjectRoot,
  findProjectRoots,
  readProjectConfig,
  writeProjectConfig
} from '@/core/project-config.js'
import { IntentError } from '@/core/errors.js'
import type { ProjectRecord } from '@/core/records.js'
import { PROJECT_CONFIG_FILE, createProjectStore } from '@/core/store.js'
import { PathsService } from '../utils/paths-service.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'

export class ProjectRegistryService {

  clName = 'ProjectRegistryService'

  // Services
  private pathsService = new PathsService()

  /**
   * The System project: the engine directory, holding the bundled extensions
   * every project inherits from.
   */
  getSystemProject(): ProjectRecord {
    const path = this.pathsService.getEnginePath()
    return {
      id: 'system',
      name: ServerOnlyTypes.systemProjectName,
      key: 'system',
      path,
      isSystem: true,
      status: 'A',
      created: new Date(0).toISOString(),
      updated: new Date(0).toISOString()
    }
  }

  /**
   * The project a path belongs to: the nearest directory at or above it
   * holding an intent.toml, or undefined when the path is not in one. A
   * project root is itself in that project, so running from the root binds
   * to it.
   */
  async getProjectByPath(fullPath: string): Promise<ProjectRecord | undefined> {

    const root = findProjectRoot(fullPath)
    if (root == null) return undefined

    return await this.getProjectByRoot(root)
  }

  /**
   * A directory that is known to hold an intent.toml. Unlike
   * `getProjectByPath` this does not walk up: it describes the directory it is
   * given, so a caller that has already resolved the root gets exactly that
   * project rather than the one containing it.
   */
  async getProjectByRoot(root: string): Promise<ProjectRecord> {

    const config = await readProjectConfig(root)
    const key = config.key ?? getAsKey(config.name)

    return {
      id: key,
      name: config.name,
      key,
      path: root,
      isSystem: false,
      status: 'A',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  }

  /**
   * The project the engine is running in, which is the one whose intent.toml
   * is the nearest one above the working directory. This is what every command
   * defaults to.
   */
  async getCurrentProject(
    cwd: string = process.cwd()
  ): Promise<ProjectRecord | undefined> {

    return await this.getProjectByPath(cwd)
  }

  /**
   * Every project at or below a directory, for the Projects menu. The System
   * project is not among them: it is not the user's, and it is never built.
   */
  async getProjectList(
    root: string = process.cwd(),
    depth: number = 3
  ): Promise<ProjectRecord[]> {

    const roots = await findProjectRoots(root, depth)
    const projects: ProjectRecord[] = []

    for (const projectRoot of roots) {

      // A directory that cannot be read is skipped rather than failing the
      // listing: one unreadable project should not hide the rest.
      const project = await this.getProjectByRoot(projectRoot)
        .catch(() => undefined)

      if (project != null) projects.push(project)
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * A project by the name or key the user typed. Matching is by name first
   * and by key second, so a project is reachable by either.
   */
  async getProjectByNameOrKey(
    root: string,
    nameOrKey: string
  ): Promise<ProjectRecord | undefined> {

    const wanted = nameOrKey.trim().toLowerCase()

    const projects = await this.getProjectList(root)

    return projects.find(
      (project) =>
        project.name.toLowerCase() === wanted ||
        project.key.toLowerCase() === wanted
    )
  }

  /** The store for a project. The System project's lives beside the engine. */
  getStore(project: ProjectRecord) {
    return createProjectStore(project.path)
  }

  /**
   * The store for the project containing a path, or the System project's when
   * there is none. A command run outside any project still has somewhere to
   * read the bundled extensions from.
   */
  async getStoreForPath(fullPath: string) {

    const project = await this.getProjectByPath(fullPath)

    if (project != null) {
      return { project, store: createProjectStore(project.path) }
    }

    const system = this.getSystemProject()
    return { project: system, store: createProjectStore(system.path) }
  }

  /**
   * Creates a project's intent.toml. The directory has to exist: an empty
   * project with no directory is not something the engine can build in.
   */
  async createProject(
    projectPath: string,
    name: string
  ): Promise<ProjectRecord> {

    const root = join(projectPath)

    if (existsSync(join(root, PROJECT_CONFIG_FILE))) {
      const existing = await readProjectConfig(root)
      throw new IntentError({
        category: 'ProjectError',
        stage: `${this.clName}.createProject()`,
        message: `${root} is already a project`,
        detail: `it already has an intent.toml naming "${existing.name}"`
      })
    }

    // Writing the file is what makes the directory a project, so the record
    // is read back from it rather than assembled here: the two cannot
    // disagree about what the project is.
    await writeProjectConfig(root, { name, key: getAsKey(name) })

    return await this.getProjectByRoot(root)
  }
}
