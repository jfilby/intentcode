/**
 * Directory walking.
 *
 * The engine reads a project's own tree in several places — the Intent files,
 * the tech-stack spec, the source it indexes, the extension directories. This
 * is the one traversal they share, so the rules about what a walk skips live
 * in one place rather than in each caller.
 */

import { readdir, stat } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'

export interface WalkDirConfig {
  recursive: boolean
  /** Only files with these extensions, each including the dot. */
  fileExts?: string[]
  /** Paths matching any of these, tested against the normalized full path. */
  ignoreRegexs?: RegExp[]
}

/**
 * Every file below `dir`, as absolute paths, in the order the filesystem
 * returns them. `fileList` is appended to and also returned, so a caller can
 * either seed a list across several walks or read the result directly.
 */
export async function walkDir(
  dir: string,
  fileList: string[],
  config: WalkDirConfig,
  root: string = dir
): Promise<string[]> {

  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {

    const fullPath = join(dir, entry.name)

    if (isIgnored(fullPath, root, config)) continue

    if (entry.isDirectory()) {

      if (config.recursive) await walkDir(fullPath, fileList, config, root)
      continue
    }

    if (entry.isFile() === false) continue

    // An extension filter that is present and does not match excludes the
    // file. One that is absent includes every file, which is what a walk for
    // "all of it" asks for.
    if (config.fileExts != null) {
      const dot = fullPath.lastIndexOf('.')
      const extension = dot < 0 ? '' : fullPath.slice(dot)
      if (config.fileExts.includes(extension) === false) continue
    }

    fileList.push(fullPath)
  }

  return fileList
}

/**
 * Whether a path is excluded by the config. Only the path within the walk is
 * tested, normalized and made relative to the walk root, so a pattern written
 * against the project layout matches at any depth, a pattern written against
 * a platform's separator matches on any platform, and where the project
 * happens to live on disk is irrelevant to it.
 */
function isIgnored(
  fullPath: string,
  root: string,
  config: WalkDirConfig
): boolean {

  if (config.ignoreRegexs == null) return false

  // Only the path *within* the walk is tested. The absolute path was tested
  // as well, and a pattern is a whole-segment match on a directory name —
  // so a project that happened to live under any segment named `tmp`,
  // `build`, `out`, `lib`, `es`, `logs` or `coverage` had its entire source
  // tree skipped and every dependency inferred from it silently lost. The
  // pattern describes the tree being walked, never where the tree happens to
  // be sitting.
  const relative = normalize(fullPath.slice(root.length).replace(/^[\\/]+/, ''))
  const posix = relative.split(sep).join('/')

  for (const pattern of config.ignoreRegexs) {
    if (pattern.test(posix)) return true
  }

  return false
}

/** The files immediately below `dir`, one level, no filtering. */
export async function listSubdirectories(dir: string): Promise<string[]> {

  const entries = await readdir(dir, { withFileTypes: true })
  const subdirectories: string[] = []

  for (const entry of entries) {
    if (entry.isDirectory() === false) continue
    const fullPath = join(dir, entry.name)
    // A symlink to a directory reads as one to readdir, and stat follows it,
    // so a link pointing nowhere is skipped rather than thrown on.
    const info = await stat(fullPath).catch(() => undefined)
    if (info?.isDirectory() === true) subdirectories.push(fullPath)
  }

  return subdirectories
}
