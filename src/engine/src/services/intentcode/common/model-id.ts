import { resolveModelForTask } from '@/core/ai/model.js'
import { findProjectRoot, readProjectConfig } from '@/core/project-config.js'
import type { ProjectConfig } from '@/core/project-config.js'
import type { IntentCodeAiTasks } from '@/types/server-only-types.js'

// The config of each project read so far, so a build resolving a model id per
// file reads its intent.toml once rather than once per file.
const projectConfigs = new Map<string, ProjectConfig | undefined>()

/**
 * The model id an AI task runs on, which is what a generation record records
 * as having produced it. The project's `intent.toml` names it, either for the
 * task specifically or as the project's shared model; the environment is the
 * fallback for a project that names neither.
 */
export async function getModelId(aiTask: IntentCodeAiTasks): Promise<string> {

  // The project the command is running in
  const projectPath = findProjectRoot()

  if (projectPath == null) {

    return resolveModelForTask(aiTask, undefined, undefined).id
  }

  // Its config, read once
  if (projectConfigs.has(projectPath) === false) {

    const projectConfig =
      await readProjectConfig(projectPath)
        .catch(() => undefined)

    projectConfigs.set(projectPath, projectConfig)
  }

  const projectConfig = projectConfigs.get(projectPath)

  return resolveModelForTask(
    aiTask,
    projectConfig?.model,
    projectConfig?.models).id
}
