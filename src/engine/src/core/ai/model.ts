/**
 * Model selection.
 *
 * A model is named the same way Pi names one: `provider/model`, with an
 * optional `:thinking` suffix. `intent.toml` may state the two halves as
 * separate `provider` and `model` keys, and they are joined here, so a project
 * that names a provider is always talking to that provider.
 *
 * Everything about *how* a request is made — credentials, endpoints, retries,
 * transport — belongs to Pi. What is left for the engine is turning a
 * project's configuration into a selector Pi can resolve, and saying so
 * clearly when the configuration cannot be resolved at all.
 */

import { IntentError } from '../errors.js'
import { readProjectConfig } from '../project-config.js'
import type { ProjectConfig, ProjectModelConfig } from '../project-config.js'

/**
 * The AI tasks a project can name a model for. A task with no entry of its own
 * falls back to the project's shared `[model]`, and then to the environment.
 */
export enum IntentCodeAiTasks {
  /** Every task the engine runs: analysis, the tech stack, and the agent. */
  compiler = 'compiler'
}

function modelError(message: string, detail?: string): IntentError {
  return new IntentError({
    category: 'AiError',
    stage: 'model',
    message,
    detail
  })
}

/**
 * The selector for a task, from a project's `[model]` and `[models.<task>]`
 * tables over the `AI_MODEL` environment variable.
 *
 * The per-task table wins over the shared one, and a table naming a provider
 * but no model is joined with the model the environment names, so the two
 * halves can be stated in whichever place each of them is already known.
 */
export function resolveModelPattern(
  task: IntentCodeAiTasks,
  shared: ProjectModelConfig | undefined,
  perTask: Record<string, ProjectModelConfig> | undefined,
  env: NodeJS.ProcessEnv = process.env
): string {

  const config = perTask?.[task] ?? shared
  const fromEnv = env.AI_MODEL?.trim() ?? ''

  // Nothing configured: the environment is the only source.
  if (config == null) {

    if (fromEnv === '') {
      throw modelError(
        'no model configured',
        'set a [model] table in intent.toml, or set AI_MODEL ' +
          '(for example AI_MODEL=google/gemini-3.1-pro-preview)')
    }

    return fromEnv
  }

  // A provider with no model of its own: the environment names the model, and
  // only the environment can, so the halves are joined rather than one
  // silently standing in for the other.
  if (config.model == null) {

    const separator = fromEnv.indexOf('/')

    if (separator <= 0) {
      throw modelError(
        `the model for ${task} names a provider but no model`,
        'set "model" in the [model] table, or set AI_MODEL to ' +
          `${config.provider}/<model>`)
    }

    return `${config.provider}/${fromEnv.slice(separator + 1)}`
  }

  // A model id goes to the provider as written, so a table that names the
  // provider twice is asking that provider for a model it does not have.
  if (config.provider != null &&
      config.model.split('/')[0] === config.provider) {

    throw modelError(
      `the model for ${task} names the provider twice`,
      `either drop "provider" and keep "${config.model}", or set ` +
        `model to the id on its own`)
  }

  return config.provider == null
    ? config.model
    : `${config.provider}/${config.model}`
}

// The config of each project read so far. A build resolves a model per file
// and a session per chat turn, and the file that names them is read once.
const projectConfigs = new Map<string, ProjectConfig | undefined>()

/** The config for the project the command was run in, read from its cwd. */
async function getProjectConfig(): Promise<ProjectConfig | undefined> {

  const projectPath = process.cwd()

  if (projectConfigs.has(projectPath) === false) {
    projectConfigs.set(
      projectPath,
      await readProjectConfig(projectPath).catch(() => undefined))
  }

  return projectConfigs.get(projectPath)
}

/** The model selector an AI task runs on, for the current project. */
export async function getModelPattern(
  task: IntentCodeAiTasks): Promise<string> {

  const projectConfig = await getProjectConfig()

  return resolveModelPattern(
    task,
    projectConfig?.model,
    projectConfig?.models)
}
