import os from 'os'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@/prisma/client.js'
// Optional: import libSQL adapter if using Bun + SQLite
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const APP_NAME = 'IntentCode'

// 1. Determine user DB location
function getUserAppDir() {

  const home = os.homedir()

  // Windows
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
      APP_NAME)
  }

  // MacOS
  if (process.platform === 'darwin') {
    return path.join(
      home,
      'Library', 'Application Support',
      APP_NAME)
  }

  // All others (e.g. Linux)
  return path.join(
    process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'),
    APP_NAME)
}

const userAppDir = getUserAppDir()

if (!fs.existsSync(userAppDir)) {
  fs.mkdirSync(userAppDir, { recursive: true })
}

// Default database URL
export const sqlLiteFile = path.join(userAppDir, 'data.db')

process.env.DATABASE_URL ||= `file:${sqlLiteFile}`

// 2. Copy the SQLite DB file to the userAppDir if not yet there.
//
// The seed must be located relative to the installed package, not to the
// process's working directory. The old path was './prisma/schema/data.db',
// which is cwd-relative: for a globally installed `intent` binary the cwd is
// the user's own project, so the copy threw ENOENT and the CLI died on first
// run for every new user.
if (!fs.existsSync(sqlLiteFile)) {

  // Locate the seed by searching up from each candidate root for the file
  // itself, rather than counting levels up from a module location. A bare
  // `__dirname` cannot be trusted here: the Prisma generated client assigns
  // `globalThis['__dirname']` when imported, and __dirname does not exist at
  // all when tsx loads the sources as ESM. The old build used
  // './prisma/schema/data.db', which is cwd-relative, so a globally installed
  // `intent` binary (cwd = the user's project) died with ENOENT on first run.
  const seedRelPath = path.join('prisma', 'schema', 'data.db')

  const seeds: string[] = typeof __dirname !== 'undefined'
    ? [__dirname, process.cwd()]
    : [process.cwd()]

  var seedFilename: string | undefined = undefined

  for (const seed of seeds) {

    var cur = path.resolve(seed)

    while (true) {

      const candidate = path.join(cur, seedRelPath)

      if (fs.existsSync(candidate)) {
        seedFilename = candidate
        break
      }

      const parent = path.dirname(cur)

      if (parent === cur) {
        break
      }

      cur = parent
    }

    if (seedFilename != null) {
      break
    }
  }

  if (seedFilename == null) {

    console.error(
      `Unable to create the IntentCode database: could not find ` +
      `${seedRelPath} in any parent of the engine installation.`)

    process.exit(1)
  }

  fs.copyFileSync(
    seedFilename,
    `${userAppDir}${path.sep}data.db`)
}

// 3. Create PrismaClient singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient
}

// Initialize client (SQLite only)
const client =
  new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.DATABASE_URL!,
    }),
    log: ['warn', 'error'],
  })

// Define the prisma export and global
export const prisma =
  global.prisma ||
  client

if (process.env.NODE_ENV !== 'production') global.prisma = prisma
