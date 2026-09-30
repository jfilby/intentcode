/**
 * Name and key derivation.
 *
 * A project is addressed by a key, which has to survive a rename of the
 * directory it lives in and cannot contain a path separator, because it names
 * files under a project's `.intent/` directory. A name is what the user
 * typed; a key is what the engine stores.
 */

import { createHash } from 'node:crypto'
import { IntentError } from './errors.js'

/** The longest key kept as readable text; longer names are hashed whole. */
const MAX_KEY_LENGTH = 48


const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

/**
 * The key for a name: lower case, non-alphanumerics collapsed to single
 * dashes, trimmed of leading and trailing dashes. An empty result (a name
 * that was nothing but punctuation) is a stable hash of the original, so two
 * different such names do not collide on the same empty key.
 */
export function getAsKey(name: string): string {

  const key = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (key !== '') return key.slice(0, MAX_KEY_LENGTH)

  return `p-${createHash('sha256')
    .update(name, 'utf8')
    .digest('hex')
    .slice(0, 12)}`
}

/** Whether a name is one a project may carry. */
export function validateName(name: string): string | undefined {

  if (name == null || name.trim() === '') {
    return 'the name is empty'
  }

  if (name.length > 128) {
    return 'the name is longer than 128 characters'
  }

  // A name is only a label; the key is what addresses the project. Refusing
  // control characters keeps a name from breaking a prompt or a terminal.

  if (CONTROL_CHARACTERS.test(name)) {
    return 'the name contains control characters'
  }

  return undefined
}

/** Whether a key is one a project may be addressed by. */
export function validateKey(key: string): string | undefined {

  if (key == null || key === '') {
    return 'the key is empty'
  }

  if (/^[a-z0-9][a-z0-9-]*$/.test(key) === false) {
    return 'the key must be lower case letters, digits and dashes'
  }

  return undefined
}

/** Throws unless the name is usable, so a caller need not check twice. */
export function requireValidName(name: string, stage: string): void {

  const problem = validateName(name)

  if (problem !== undefined) {
    throw new IntentError({
      category: 'ValidationError',
      stage,
      message: `invalid project name: ${problem}`,
      detail: `name: ${JSON.stringify(name)}`
    })
  }
}
