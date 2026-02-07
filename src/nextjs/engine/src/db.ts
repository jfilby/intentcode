import os from 'os'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
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

// 2. Copy the SQLite DB file to the userAppDir if not yet there
if (!fs.existsSync(sqlLiteFile)) {

  fs.copyFileSync(
    `.${path.sep}prisma${path.sep}schema${path.sep}data.db`,
    `${userAppDir}${path.sep}data.db`)
}

// 3. Create PrismaClient singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient
}

// Initialize correct client
const isSQLite = true;

const client = isSQLite
  ? new PrismaClient({
      adapter: new PrismaLibSql({
        url: process.env.DATABASE_URL!,
      }),
      log: ['warn', 'error'],
    })
  : new PrismaClient({
      log: ['warn', 'error'],
    })

// Define the prisma export and global
export const prisma =
  global.prisma ||
  client

if (process.env.NODE_ENV !== 'production') global.prisma = prisma
