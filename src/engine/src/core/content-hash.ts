/**
 * The hash the engine records file content under.
 *
 * One function, because a file's content is compared against itself in three
 * places — when the compiler records what a session wrote, when drift is
 * checked, and when a build decides a file needs no recompiling. Two copies of
 * this convention that drift apart do not fail loudly: every file simply
 * reports as drifted, or none does.
 *
 * The JSON round-trip is deliberate and load-bearing. Hashing the string
 * directly would be marginally cheaper, but it would be a *different* digest,
 * and every record already on disk was written under the current one. Changing
 * it is a migration that makes every file in every existing project report as
 * drifted until each is recompiled once. Normalising line endings here would
 * have the same effect, so it is a decision to make on purpose rather than a
 * cleanup to make quietly.
 */

import { blake3 } from '@noble/hashes/blake3'

/** The hash of a file's content, comparable with the hashes already recorded. */
export function hashContent(content: string) {
  return blake3(JSON.stringify(content)).toString()
}
