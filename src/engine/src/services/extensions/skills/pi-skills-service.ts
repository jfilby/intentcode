/**
 * Which skills a session is given.
 *
 * A skill is loaded into the graph by the extension that carries it, and the
 * engine decides which of them apply to the work at hand. A session is handed
 * that decision as a plain list of files: it reads a skill when it is about to
 * do the thing the skill is about, rather than carrying the whole set of an
 * extension's conventions in its prompt whether or not they are relevant.
 *
 * Two things decide whether a skill applies, both declared in the skill's own
 * front-matter:
 *
 * - `context.fileExts` — the skill is about files of those extensions. A
 *   TypeScript skill has nothing to say about a JSON file.
 * - `context.anyDependency` — the project has to have the dependency, at or
 *   above the stated version. A Next.js skill does not apply to a project that
 *   does not have Next.js.
 *
 * A skill declaring neither applies everywhere: that is what a general
 * convention is, and requiring it to be narrowed would mean every such skill
 * repeated the same exemption.
 */

import fs from 'fs'
import path from 'path'
import semver from 'semver'
import type { Skill } from '@oh-my-pi/pi-coding-agent'
import type { SourceNodeRecord } from '@/core/records.js'
import { ExtensionsData } from '@/types/source-graph-types.js'

/** A skill's front-matter, as far as the gates are concerned. */
interface SkillContext {
  /** The extensions this skill is about, e.g. `.ts, .tsx`. */
  fileExts?: string

  /** At least one of these dependencies, at or above its version. */
  anyDependency?: {
    name: string
    minVersion: number | string
  }[]
}

// A version as a skill states it, compared against what package.json says.
// Both sides are coerced, because a front-matter states a major on its own
// (`minVersion: 5`) where package.json states a full version, and `5` is not
// a version semver will parse.
function isSatisfied(
        installed: string | undefined,
        minVersion: number | string): boolean {

  if (installed == null) return false

  const installedVersion = semver.coerce(installed)
  const requiredVersion = semver.coerce(String(minVersion))

  if (installedVersion == null || requiredVersion == null) return false

  return semver.gte(installedVersion, requiredVersion)
}

/**
 * The dependencies a project has, as name -> version.
 *
 * `devDependencies` counts as much as `dependencies`: a TypeScript project
 * declares TypeScript as a dev dependency, and a skill about TypeScript is
 * exactly what that project needs. A dependency listed in both takes the
 * runtime one, which is the one the project actually ships.
 */
function readProjectDependencies(projectPath: string) {

  let packageJson: unknown

  try {
    packageJson = JSON.parse(
      fs.readFileSync(
        path.join(projectPath, 'package.json'),
        { encoding: 'utf8' }))
  } catch {
    // A project with no package.json has no dependencies, so every skill that
    // gates on one is correctly left out rather than failing the run.
    return {}
  }

  if (packageJson == null || typeof packageJson !== 'object') return {}

  const manifest = packageJson as Record<string, unknown>

  const declared: Record<string, string> = {}

  for (const field of ['devDependencies', 'dependencies']) {

    const group = manifest[field]

    if (group == null ||
        typeof group !== 'object' ||
        Array.isArray(group)) {

      continue
    }

    for (const [name, version] of Object.entries(group)) {
      if (typeof version === 'string' && declared[name] == null) {
        declared[name] = version
      }
    }
  }

  return declared
}

// Class
export class PiSkillsService {

  // Consts
  clName = 'PiSkillsService'

  /**
   * The skills that apply to a file of `targetFileExt`, as the session-ready
   * list. A skill the extension wrote as `typescript.md` is passed on under
   * that name: Pi addresses a skill by the file it is in, and the name is what
   * a prompt refers to it by.
   */
  getSkills(
          extensionsData: ExtensionsData,
          projectPath: string,
          targetFileExt?: string): Skill[] {

    // The project's dependencies decide the version gate
    const dependencies = readProjectDependencies(projectPath)

    const skills: Skill[] = []

    for (const skillNode of extensionsData.skillNodes) {

      const skill = this.toSkill(skillNode, dependencies, targetFileExt)

      if (skill != null) skills.push(skill)
    }

    // Return
    return skills
  }

  /** One skill, or null when it does not apply here. */
  private toSkill(
            skillNode: SourceNodeRecord,
            dependencies: Record<string, string>,
            targetFileExt: string | undefined): Skill | null {

    const jsonContent = skillNode.jsonContent
    const context = this.getContext(jsonContent)

    // The fileExts gate: a skill about a kind of file does not apply to
    // another kind. A skill that names no extension applies to all of them.
    if (context.fileExts != null && targetFileExt != null) {

      const fileExts = context.fileExts
        .split(',')
        .map((fileExt) => fileExt.trim())
        .filter((fileExt) => fileExt !== '')

      if (fileExts.includes(targetFileExt) === false) return null
    }

    // The anyDependency gate: the project has to have the dependency, at or
    // above the version the skill asks for.
    if (context.anyDependency != null) {

      const satisfied = context.anyDependency.some(
        (dependency) =>
          isSatisfied(dependencies[dependency.name], dependency.minVersion))

      if (satisfied === false) return null
    }

    // The file the session reads the skill from
    const filePath = this.getFilePath(jsonContent)

    if (filePath == null) return null

    // Pi's Skill names the file, and the description is what a session matches
    // a skill against when deciding whether to read it.
    return {
      name: path.basename(filePath, path.extname(filePath)),
      description: this.getDescription(jsonContent),
      filePath,
      baseDir: path.dirname(filePath),
      source: 'intentcode'
    }
  }

  /** The `context` block of a skill's front-matter. */
  private getContext(jsonContent: unknown): SkillContext {

    if (jsonContent == null ||
        typeof jsonContent !== 'object' ||
        !('context' in jsonContent)) {

      return {}
    }

    const context = jsonContent.context

    if (context == null || typeof context !== 'object') return {}

    return {
      fileExts: 'fileExts' in context &&
        typeof context.fileExts === 'string'
        ? context.fileExts
        : undefined,
      anyDependency: 'anyDependency' in context &&
        Array.isArray(context.anyDependency)
        ? context.anyDependency as SkillContext['anyDependency']
        : undefined
    }
  }

  private getFilePath(jsonContent: unknown): string | undefined {

    if (jsonContent == null ||
        typeof jsonContent !== 'object' ||
        !('filePath' in jsonContent) ||
        typeof jsonContent.filePath !== 'string') {

      return undefined
    }

    return jsonContent.filePath
  }

  private getDescription(jsonContent: unknown): string {

    if (jsonContent == null ||
        typeof jsonContent !== 'object' ||
        !('description' in jsonContent) ||
        typeof jsonContent.description !== 'string') {

      return ''
    }

    return jsonContent.description
  }
}
