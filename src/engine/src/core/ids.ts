/**
 * Record identifiers.
 *
 * A cuid: a timestamp, a counter and some randomness, so two records created
 * in the same millisecond by different processes still get different ids, and
 * an id sorts roughly in the order its record was made. That last property is
 * what lets a collection order by `created` and treat the order as stable
 * without a tiebreak.
 */

import { randomBytes } from 'node:crypto'

let counter = randomBytes(3).readUIntBE(0, 3)

export function createId(): string {
  counter = (counter + 1) % 0xffffff
  const time = Date.now().toString(36).padStart(9, '0')
  const count = counter.toString(36).padStart(4, '0')
  const random = randomBytes(4).toString('hex')
  return `${time}${count}${random}`
}
