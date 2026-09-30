/**
 * Project configuration: `intent.toml`.
 *
 * There is nothing to register and no list to search: a directory is a
 * project because it holds an intent.toml, and a command resolves the project
 * it was run in by reading that file.
 *
 * The file is read with the same rules the rest of the engine reads data
 * with: a field that is present but the wrong type is an error naming the
 * field, and a field that is absent takes its default.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { IntentError } from './errors.js'
import { PROJECT_CONFIG_FILE } from './store.js'


export interface ProjectModelConfig {
  /** A `provider/model` spec, e.g. `google/gemini-3.1-pro-preview`. */
  provider?: string
  model?: string
}

export interface ProjectConfig {
  /** The project name, as shown in the CLI. */
  name: string
  /** The stable slug the project is addressed by. Defaults to `name`. */
  key?: string
  /** Framework and preferred libraries, read as the compiler's tech stack. */
  techStack?: string
  /** A directory of extensions to load into the project. */
  extensions?: string[]
  /** The model every AI task uses unless a task names its own. */
  model?: ProjectModelConfig
  /** Per-task model overrides, keyed by AI task name. */
  models?: Record<string, ProjectModelConfig>
}

function configError(
  path: string,
  message: string,
  detail?: string
): IntentError {
  return new IntentError({
    category: 'ConfigError',
    message: `${path}: ${message}`,
    detail
  })
}

function optionalString(
  value: unknown,
  field: string,
  path: string
): string | undefined {

  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw configError(path, `"${field}" must be a string`)
  }
  return value
}

function optionalStringArray(
  value: unknown,
  field: string,
  path: string
): string[] | undefined {

  if (value === undefined) return undefined
  if (Array.isArray(value) === false) {
    throw configError(path, `"${field}" must be an array of strings`)
  }
  for (const entry of value) {
    if (typeof entry !== 'string') {
      throw configError(path, `"${field}" must be an array of strings`)
    }
  }
  return value as string[]
}

function modelConfig(
  value: unknown,
  field: string,
  path: string
): ProjectModelConfig | undefined {

  if (value === undefined) return undefined
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw configError(
      path,
      `"${field}" must be a table with "provider" and "model"`,
      'for example [model]\n  provider = "google"\n  model = "gemini-3.1-pro-preview"')
  }
  const table = value as Record<string, unknown>
  const config: ProjectModelConfig = {
    provider: optionalString(table.provider, `${field}.provider`, path),
    model: optionalString(table.model, `${field}.model`, path)
  }
  if (config.provider == null && config.model == null) {
    throw configError(
      path,
      `"${field}" names no model`,
      'set at least "provider" or "model"')
  }
  return config
}

/**
 * Validates a parsed intent.toml. The name is the only required field: a
 * project is addressable without one, falling back to its directory name, so
 * a project can be created by dropping an empty file in place.
 */
export function normalizeProjectConfig(
  parsed: unknown,
  path: string
): ProjectConfig {

  if (parsed == null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)) {

    throw configError(path, 'is not a table')
  }

  const table = parsed as Record<string, unknown>

  const name = optionalString(table.name, 'name', path) ??
    basename(dirname(path))
  const key = optionalString(table.key, 'key', path) ?? name

  const config: ProjectConfig = { name, key }

  const techStack = optionalString(table.techStack, 'techStack', path)
  if (techStack !== undefined) config.techStack = techStack

  const extensions =
    optionalStringArray(table.extensions, 'extensions', path)
  if (extensions !== undefined) config.extensions = extensions

  const model = modelConfig(table.model, 'model', path)
  if (model !== undefined) config.model = model

  const models = table.models
  if (models !== undefined) {
    if (models == null ||
        typeof models !== 'object' ||
        Array.isArray(models)) {

      throw configError(
        path,
        '"models" must be a table of AI task names')
    }
    const perTask: Record<string, ProjectModelConfig> = {}
    for (const [task, value] of Object.entries(
      models as Record<string, unknown>)) {
      const config_ = modelConfig(value, `models.${task}`, path)
      if (config_ != null) perTask[task] = config_
    }
    config.models = perTask
  }

  return config
}

export async function readProjectConfig(
  projectPath: string
): Promise<ProjectConfig> {

  const path = join(projectPath, PROJECT_CONFIG_FILE)

  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (cause) {
    throw new IntentError({
      category: 'ConfigError',
      message: `cannot read ${path}`,
      detail: cause instanceof Error ? cause.message : String(cause)
    })
  }

  let parsed: unknown
  try {
    parsed = parseToml(text)
  } catch (cause) {
    throw new IntentError({
      category: 'ConfigError',
      message: `${path} is not valid TOML`,
      detail: cause instanceof Error ? cause.message : String(cause)
    })
  }

  return normalizeProjectConfig(parsed, path)
}

export async function writeProjectConfig(
  projectPath: string,
  config: ProjectConfig
): Promise<void> {

  const path = join(projectPath, PROJECT_CONFIG_FILE)

  // A key equal to the name is the default, so writing it would put a line in
  // every project's file that says nothing.
  const table: Record<string, unknown> = { name: config.name }
  if (config.key != null && config.key !== config.name) {
    table.key = config.key
  }
  if (config.techStack != null) table.techStack = config.techStack
  if (config.extensions != null) table.extensions = config.extensions
  if (config.model != null) table.model = config.model
  if (config.models != null) table.models = config.models

  await writeFile(path, stringifyToml(table), 'utf8')
}
