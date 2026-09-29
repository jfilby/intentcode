/**
 * What the engine is currently configured with.
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
import { resolveModelForTask } from '@/core/ai/model.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'

export class InfoService {

  clName = 'InfoService'

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
    console.log(`# AI models`)

    for (const aiTask of Object.values(IntentCodeAiTasks)) {

      let modelId: string

      try {
        modelId = resolveModelForTask(
          aiTask,
          config?.model,
          config?.models
        ).id
      } catch (error) {
        modelId = isIntentError(error)
          ? `(not set: ${error.message})`
          : `(not set: ${String(error)})`
      }

      console.log(`AI model for ${aiTask}: ${modelId}`)
    }

    console.log(``)
  }
}
