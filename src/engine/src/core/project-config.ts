/**
 * Project configuration: `intent.toml`.
 *
 * registration step: there is no separate list to add a directory to, and the
 * project is found by walking up from the working directory, so running the
 * compiler in a subdirectory of a project binds to that project.
 *
 * The file is read with the same rules the rest of the engine reads data
 * with: a field that is present but the wrong type is an error naming the
 * field, and a field that is absent takes its default.
 */
import type { Dirent } from 'node:fs'
import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, parse, resolve, sep } from 'node:path'
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

/**
 * The nearest directory at or above `from` holding an intent.toml, or
 * undefined when there is none. Resolving first matters: walking up from a
 * relative path never reaches the root, and the loop below would not
 * terminate.
 */
export function findProjectRoot(
  from: string = process.cwd()
): string | undefined {

  const root = parse(resolve(from)).root
  let current = resolve(from)

  while (true) {
    if (existsSync(join(current, PROJECT_CONFIG_FILE))) return current
    if (current === root) return undefined
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

export function isWithinPath(fullPath: string, rootPath: string): boolean {
  const resolved = resolve(fullPath)
  const root = resolve(rootPath)
  if (resolved === root) return true
  // Containment rather than a prefix test, so /a/proj-b is not read as living
  // inside /a/proj.
  return resolved.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)
}

/**
 * Every intent.toml at or below `root`, as the project paths they name. Used
 * to list the projects under a directory, which is what the Projects menu
 * shows when it is run outside one.
 */
export async function findProjectRoots(
  root: string,
  depth: number = 3
): Promise<string[]> {

  const found: string[] = []
  const queue: { path: string; depth: number }[] = [{ path: root, depth: 0 }]

  while (queue.length > 0) {
    const next = queue.shift()!
    if (next.depth > depth) continue
    if (existsSync(join(next.path, PROJECT_CONFIG_FILE))) {
      found.push(next.path)
      // A project is a tree: a project inside a project is its own root, and
      // its own children are found from it.
      continue
    }
    let entries: Dirent[]
    try {
      entries = await readdir(next.path, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory() === false) continue
      if (entry.name.startsWith('.')) continue
      if (entry.name === 'node_modules') continue
      queue.push({ path: join(next.path, entry.name), depth: next.depth + 1 })
    }
  }

  return found.sort()
}

/** Resolves a project argument, which may be a path or a key, to a path. */
export function resolveProjectPath(
  reference: string,
  cwd: string = process.cwd()
): string | undefined {

  if (isAbsolute(reference) || reference.startsWith('.') ||
      reference.includes('/') || reference.includes(sep)) {

    const candidate = resolve(cwd, reference)
    return existsSync(join(candidate, PROJECT_CONFIG_FILE))
      ? candidate
      : undefined
  }

  return findProjectRoot(cwd)
}
