/**
 * What the CLI reports about a project.
 *
 * The model is reported per AI task, because a project may name a different
 * model per task and the answer to "which model did this use" is otherwise
 * only visible in the code. A task whose model cannot be resolved says so
 * rather than printing a blank line, since an unconfigured model is the one
 * thing worth knowing before a build is started.
 */

import { isIntentError } from '@/core/errors.js'
import { readProjectConfig } from '@/core/project-config.js'
import type { ProjectRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { IntentCodeAiTasks, resolveModelPattern } from '@/core/ai/model.js'

export class InfoService {

  clName = 'InfoService'

  /** The project a command resolved to, which is what `about` reports. */
  about(project: ProjectRecord) {

    console.log(``)
    console.log(`# ${project.name}`)
    console.log(``)
    console.log(`Path: ${project.path}`)
    console.log(`Key: ${project.key}`)
    console.log(``)
  }

  async info(store: ProjectStore, project: ProjectRecord) {

    console.log(``)
    console.log(`# Info`)
    console.log(``)

    console.log(`Project: ${project.name}`)
    console.log(`Path: ${project.path}`)
    console.log(`State: ${store.statePath}`)

    // The project's own config is what names its models, so it is read
    // rather than assumed: a project with no [model] table falls through to
    // the environment and should be reported as doing so.
    const config = await readProjectConfig(project.path)
      .catch(() => undefined)

    if (config == null) {
      console.log(`Config: (unreadable)`)
    } else {
      console.log(`Tech stack: ${config.techStack ?? '(not set)'}`)
    }

    console.log(``)
    console.log(`# Models`)

    for (const aiTask of Object.values(IntentCodeAiTasks)) {

      let modelPattern: string

      try {
        modelPattern = resolveModelPattern(
          aiTask,
          config?.model,
          config?.models)
      } catch (error) {
        modelPattern = isIntentError(error)
          ? `(not set: ${error.message})`
          : `(not set: ${String(error)})`
      }

      console.log(`Model for ${aiTask}: ${modelPattern}`)
    }

    console.log(``)
  }
}
