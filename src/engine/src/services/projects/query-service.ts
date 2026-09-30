/**
 * Reading projects.
 *
 * Resolving a project is a question about the filesystem, and lives in
 * `readProject`. What is left here is the two things that are questions about
 * a *set* of projects rather than about one: finding a project's entry in a
 * build's project map, and describing that map to the model.
 *
 * A build carries a numbered map of projects rather than one, so the compiler
 * picks one out of it by id. That lookup is here so every caller does it the
 * same way.
 */

import { IntentError } from '@/core/errors.js'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectDetails } from '@/types/server-only-types.js'

export class ProjectsQueryService {

  clName = 'ProjectsQueryService'

  label = 'project'

  /**
   * The project with this id in a build's map. A build covering more than one
   * project reaches the right one by id rather than by position, because the
   * order they were discovered in is not what the caller means.
   */
  getProjectDetailsByProjectId(
    projectId: string,
    projects: Record<number, ProjectDetails>
  ): ProjectDetails {

    for (const projectDetails of Object.values(projects)) {
      if (projectDetails.project.id === projectId) return projectDetails
    }

    throw new IntentError({
      category: 'ProjectError',
      stage: `${this.clName}.getProjectDetailsByProjectId()`,
      message: `no project details for projectId: ${projectId}`,
      detail: `the build covered: ` +
        Object.values(projects)
          .map((details) => details.project.id)
          .join(', ')
    })
  }

  /**
   * The project map as the model sees it: a numbered, indented list, so a
   * project that contains others reads as belonging to them.
   */
  getProjectsPrompting(projects: Record<number, ProjectDetails>): string {

    let prompting =
      `## Projects\n` +
      `\n` +
      `By project no:\n` +
      `\n`

    for (const [projectNo, projectDetails] of Object.entries(projects)) {

      // The indent is the nesting depth, which is what tells the model that
      // one project's specs may be built into another's source.
      const indents = ' '.repeat(projectDetails.indents * 2)

      prompting +=
        `${indents}- ${projectNo}: ${projectDetails.project.name}\n`
    }

    return `${prompting}\n`
  }

  /** The projects in a map, as records. */
  getProjects(
    projects: Record<number, ProjectDetails>
  ): ProjectRecord[] {

    return Object.values(projects).map((details) => details.project)
  }
}
