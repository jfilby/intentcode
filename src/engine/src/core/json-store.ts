/**
 * JSON filesystem storage.
 *
 * Every read and write the engine makes outside a user's own project goes
 * through this module. Paths are relative to a single root and may not escape
 * it, so a record name built from user input cannot reach the rest of the
 * disk. Writes are atomic: a record is renamed into place, so a reader never
 * observes one half written.
 */

import { createHash } from 'node:crypto'
import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { IntentError } from './errors.js'

export interface JsonStore {
  readonly root: string

  /** Absolute path for a store-relative path. Throws on escape attempts. */
  resolve(relativePath: string): string

  read<T>(relativePath: string): Promise<T>
  write<T>(relativePath: string, value: T): Promise<void>
  exists(relativePath: string): Promise<boolean>
  readText(relativePath: string): Promise<string>
  writeText(relativePath: string, contents: string): Promise<void>
  remove(relativePath: string): Promise<void>
  removeDir(relativePath: string): Promise<void>
  mkdirp(relativePath: string): Promise<void>
  listDir(relativePath: string): Promise<string[]>

  /**
   * The contents of a record a build can do without. A missing file and a
   * file that is not JSON are both no record at all. It is for the records an
   * operation regenerates when it cannot read them, never for one it has to
   * be able to read: a record that is present and unreadable is a fault, and
   * is reported as one, because the next write would destroy the only copy.
   */
  readIfValid<T>(relativePath: string): Promise<T | undefined>
}

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function hashValue(value: unknown): string {
  return hashText(JSON.stringify(value))
}

/**
 * Distinguishes the temporary files of writes that overlap. It counts every
 * write in this process rather than every write of one store: two stores
 * under different roots each start a counter at zero, and the second would
 * then name its temporary file exactly as the first did.
 */
let temporaryWrites = 0

/**
 * Puts a path on the disk rather than in the page cache. A write renamed into
 * place before its bytes are there leaves a name with nothing behind it, and
 * the next run reads that file, finds it is a record it cannot read, and
 * writes over the only copy of it.
 */
async function syncPath(path: string): Promise<void> {
  const handle = await open(path, 'r')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

function storageError(
  message: string,
  detail?: string
): IntentError {
  return new IntentError({ category: 'StorageError', message, detail })
}

export function createJsonStore(root: string): JsonStore {

  const absoluteRoot = resolve(root)

  const resolveInStore = (relativePath: string): string => {
    if (isAbsolute(relativePath)) {
      throw storageError(`store paths must be relative: ${relativePath}`)
    }
    const target = resolve(absoluteRoot, normalize(relativePath))
    const rel = relative(absoluteRoot, target)
    if (rel.startsWith('..') || rel.split(sep).includes('..')) {
      throw storageError(`store path escapes root: ${relativePath}`)
    }
    return target
  }

  /**
   * Writes through a temporary of its own and renames it into place, so the
   * path only ever names a whole record.
   */
  const writeAtomically = async (
    relativePath: string,
    produce: (temporary: string) => Promise<void>
  ): Promise<void> => {

    const file = resolveInStore(relativePath)
    await mkdir(dirname(file), { recursive: true })
    const temporary =
      `${file}.${process.pid}.${temporaryWrites++}.tmp`
    try {
      await produce(temporary)
      await syncPath(temporary)
      await rename(temporary, file)
      await syncPath(dirname(file))
    } catch (cause) {
      await rm(temporary, { force: true })
      throw storageError(
        `cannot write ${relativePath}`,
        cause instanceof Error ? cause.message : String(cause))
    }
  }

  const store: JsonStore = {

    root: absoluteRoot,
    resolve: resolveInStore,

    async read<T>(relativePath: string): Promise<T> {
      let text: string
      try {
        text = await readFile(resolveInStore(relativePath), 'utf8')
      } catch (cause) {
        throw storageError(
          `cannot read ${relativePath}`,
          cause instanceof Error ? cause.message : String(cause))
      }
      try {
        return JSON.parse(text) as T
      } catch (cause) {
        throw storageError(
          `${relativePath} is not valid JSON`,
          cause instanceof Error ? cause.message : String(cause))
      }
    },

    async readIfValid<T>(relativePath: string): Promise<T | undefined> {
      if (!(await store.exists(relativePath))) return undefined
      let text: string
      try {
        text = await readFile(resolveInStore(relativePath), 'utf8')
      } catch (cause) {
        throw storageError(
          `cannot read ${relativePath}`,
          cause instanceof Error ? cause.message : String(cause))
      }
      try {
        return JSON.parse(text) as T
      } catch {
        return undefined
      }
    },

    async write<T>(relativePath: string, value: T): Promise<void> {
      await writeAtomically(
        relativePath,
        (temporary) => writeFile(temporary, serializeJson(value), 'utf8'))
    },

    async writeText(
      relativePath: string,
      contents: string
    ): Promise<void> {
      await writeAtomically(
        relativePath,
        (temporary) => writeFile(temporary, contents, 'utf8'))
    },

    async exists(relativePath: string): Promise<boolean> {
      // The escape guard is outside the try: a path that leaves the store is
      // an error, not the absence of a file, and swallowing it would report
      // an invalid path as "no previous record".
      const file = resolveInStore(relativePath)
      try {
        const info = await stat(file)
        return info.isFile()
      } catch {
        return false
      }
    },

    async readText(relativePath: string): Promise<string> {
      try {
        return await readFile(resolveInStore(relativePath), 'utf8')
      } catch (cause) {
        throw storageError(
          `cannot read ${relativePath}`,
          cause instanceof Error ? cause.message : String(cause))
      }
    },

    async remove(relativePath: string): Promise<void> {
      await rm(resolveInStore(relativePath), { force: true })
    },

    async removeDir(relativePath: string): Promise<void> {
      await rm(resolveInStore(relativePath), {
        force: true,
        recursive: true
      })
    },

    async mkdirp(relativePath: string): Promise<void> {
      try {
        await mkdir(resolveInStore(relativePath), { recursive: true })
      } catch (cause) {
        throw storageError(
          `cannot create ${relativePath}`,
          cause instanceof Error ? cause.message : String(cause))
      }
    },

    async listDir(relativePath: string): Promise<string[]> {
      try {
        const entries = await readdir(resolveInStore(relativePath), {
          withFileTypes: true
        })
        return entries
          .filter((entry) => entry.isFile() || entry.isDirectory())
          .map((entry) => entry.name)
      } catch (cause) {
        const code = (cause as NodeJS.ErrnoException).code
        if (code === 'ENOENT') return []
        throw storageError(
          `cannot list ${relativePath}`,
          cause instanceof Error ? cause.message : String(cause))
      }
    }
  }

  return store
}

/**
 * The engine's per-user application directory, where the System project and
 * the engine's own state live. This is the same place the database used to
 * sit, so an upgrade keeps the user's data.
 */
export function getUserAppDir(appName = 'IntentCode'): string {

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ??
      join(process.env.HOME ?? process.env.USERPROFILE ?? '.', 'AppData', 'Roaming')
    return join(appData, appName)
  }

  if (process.platform === 'darwin') {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '.'
    return join(home, 'Library', 'Application Support', appName)
  }

  const dataHome = process.env.XDG_DATA_HOME ??
    join(process.env.HOME ?? '.', '.local', 'share')
  return join(dataHome, appName)
}
