/**
 * JSON filesystem storage.
 *
 * Every read and write the engine makes outside a user's own project goes
 * through this module. Paths are relative to a single root and may not escape
 * it, so a record name built from user input cannot reach the rest of the
 * disk. Writes are atomic: a record is renamed into place, so a reader never
 * observes one half written.
 */

import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, normalize, relative, resolve, sep } from 'node:path'
import { IntentError } from './errors.js'

export interface JsonStore {
  readonly root: string

  /** Absolute path for a store-relative path. Throws on escape attempts. */
  resolve(relativePath: string): string

  read<T>(relativePath: string): Promise<T>
  write<T>(relativePath: string, value: T): Promise<void>

  /**
   * A read-modify-write of one file, exclusive against every other writer of
   * it. `update` is handed what is currently there — undefined when the file
   * has never been written — and returns what should be written in its place,
   * so the read and the write it guards cannot be separated by another
   * writer's own read-modify-write.
   */
  update<T>(
    relativePath: string,
    update: (current: T | undefined) => T
  ): Promise<T>
  exists(relativePath: string): Promise<boolean>
  readText(relativePath: string): Promise<string>
  writeText(relativePath: string, contents: string): Promise<void>
  remove(relativePath: string): Promise<void>
  removeDir(relativePath: string): Promise<void>
  mkdirp(relativePath: string): Promise<void>
  listDir(relativePath: string): Promise<string[]>

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
 * Serializes the read-modify-write of one file across every writer of it.
 *
 * A record is written by rewriting the whole file, so a writer that read it
 * before another writer finished is holding an array that is already out of
 * date: writing it back drops whatever the other writer added. The queue a
 * collection keeps serializes its own writes and nothing else, so two stores
 * over one project — the tests command building the example while the CLI
 * holds a store for the project it was run from, or two builds run at once —
 * interleave their read and write and lose records. The key is the resolved
 * path, so it excludes writers in this process and in any other, and a stale
 * lock from a process that died holding one is taken over rather than waited
 * on forever.
 */
/** How long a lock file is honoured before it is taken over as abandoned. */
const STALE_LOCK_MS = 30_000

const fileQueues = new Map<string, Promise<unknown>>()

function serializeFile<T>(
  file: string,
  work: () => Promise<T>
): Promise<T> {
  const previous = fileQueues.get(file) ?? Promise.resolve()
  const result = previous.then(work, work)
  fileQueues.set(
    file,
    result.then(
      () => {
        if (fileQueues.get(file) === result) fileQueues.delete(file)
      },
      () => {
        if (fileQueues.get(file) === result) fileQueues.delete(file)
      })
  )
  return result
}

/**
 * Holds the lock file while the caller's work runs, releasing it whatever the
 * outcome. The lock is a file created exclusively: a writer that finds one
 * waits for it to go, so the read and the write it guards cannot be separated
 * by another writer's whole read-modify-write.
 *
 * A process that dies holding the lock leaves it behind, so a wait that has
 * run past `STALE_LOCK_MS` takes the lock over rather than blocking the engine
 * for good. The holder is long gone by then: a read-modify-write of one of
 * these files is milliseconds, not seconds.
 */
async function withFileLock<T>(
  lockPath: string,
  work: () => Promise<T>
): Promise<T> {

  const acquire = async (): Promise<void> => {

    const deadline = Date.now() + STALE_LOCK_MS

    while (true) {
      try {
        // 'wx' fails when the file is there, which is what makes this the
        // lock rather than a read of a shared file.
        const handle = await open(lockPath, 'wx')
        await handle.write(`${process.pid}\n`)
        await handle.close()
        return
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code !== 'EEXIST') throw cause
      }

      if (Date.now() >= deadline) {
        await rm(lockPath, { force: true })
        continue
      }

      await sleep(5)
    }
  }

  await mkdir(dirname(lockPath), { recursive: true })
  await acquire()

  try {
    return await work()
  } finally {
    await rm(lockPath, { force: true })
  }
}

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
   * The same path, refused when it names the store root itself.
   *
   * The escape test above cannot catch this: '', '.', 'a/..' and
   * 'notes.json/..' all resolve back to the root without leaving it, and
   * removeDir() through any of them recursively deleted the whole `.intent`
   * tree. Reading the root is legitimate — listDir('.') is how a caller sees
   * what the store holds — so the refusal belongs on the operations that
   * destroy or replace it rather than on resolution in general.
   */
  const resolveDestructiveInStore = (relativePath: string): string => {

    const target = resolveInStore(relativePath)

    if (target === absoluteRoot) {
      throw storageError(
        `refusing to destroy the store root: ${relativePath || '<empty>'}`)
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

    const file = resolveDestructiveInStore(relativePath)
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

    async write<T>(relativePath: string, value: T): Promise<void> {
      await writeAtomically(
        relativePath,
        (temporary) => writeFile(temporary, serializeJson(value), 'utf8'))
    },

    async update<T>(
      relativePath: string,
      update: (current: T | undefined) => T): Promise<T> {

      const file = resolveInStore(relativePath)

      return await serializeFile(
        file,
        () => withFileLock(`${file}.lock`, async () => {

          // Read under the lock, so what is handed to `update` is what every
          // other writer has finished writing rather than what was there when
          // this one started waiting.
          //
          // A file that is not there yet is a collection that has never been
          // written, which is not an error: the first create of a project is
          // what makes it. A file that is there and will not parse is a
          // different thing — the records are on the disk — so it is refused
          // rather than answered as absent.
          let current: T | undefined
          let text: string

          try {
            text = await readFile(file, 'utf8')
          } catch (cause) {
            if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') {
              throw storageError(
                `cannot read ${relativePath}`,
                cause instanceof Error ? cause.message : String(cause))
            }
            text = undefined as unknown as string
          }

          if (text != null) {
            try {
              current = JSON.parse(text) as T
            } catch (cause) {
              throw storageError(
                `${relativePath} is not valid JSON`,
                cause instanceof Error ? cause.message : String(cause))
            }
          }

          const next = update(current)

          await writeAtomically(
            relativePath,
            (temporary) =>
              writeFile(temporary, serializeJson(next), 'utf8'))

          return next
        }))
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
      await rm(resolveDestructiveInStore(relativePath), { force: true })
    },

    async removeDir(relativePath: string): Promise<void> {
      await rm(resolveDestructiveInStore(relativePath), {
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

