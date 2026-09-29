/**
 * A file-backed collection of records.
 *
 * This is what replaces the ORM. A collection is one JSON file holding an
 * array of records; reads load it and filter in memory, writes load it,
 * mutate it and write it back. The whole engine's working set is a few
 * thousand rows, so a scan costs nothing and the query surface can stay the
 * one the services already speak: a `where` of equality tests, an `orderBy`
 * of field/direction pairs, and named `include`s for the two relations the
 * graph services read.
 *
 * Writes are serialized per collection. Two overlapping read-modify-writes
 * would otherwise each start from the same array and the second would drop
 * whatever the first appended.
 */

import { IntentError } from './errors.js'
import type { JsonStore } from './json-store.js'

export type Where = Record<string, unknown>

export type OrderBy = Record<string, 'asc' | 'desc'>

export interface FindManyArgs {
  where?: Where
  orderBy?: OrderBy
  include?: Record<string, boolean>
}

export interface FindFirstArgs {
  where?: Where
  include?: Record<string, boolean>
}

export interface CreateArgs<T> {
  data: T
}

export interface UpdateArgs<T> {
  where: Where
  data: Partial<T>
}

export interface UpsertArgs<T> {
  /** Every field of the unique key, e.g. `{ key, modelId }`. */
  where: Where
  update: Partial<T>
  create: T
}

export interface DeleteManyResult {
  count: number
}

export interface Collection<T extends { id: string }> {
  readonly name: string
  readonly path: string

  all(): Promise<T[]>
  findMany(args?: FindManyArgs): Promise<T[]>
  findFirst(args?: FindFirstArgs): Promise<T | null>
  findUnique(args: { where: Where; include?: Record<string, boolean> }): Promise<T | null>
  create(args: CreateArgs<T>): Promise<T>
  update(args: UpdateArgs<T>): Promise<T>
  /** Insert when the `where` fields match nothing, update when they match. */
  upsert(args: UpsertArgs<T>): Promise<T>
  delete(args: { where: Where }): Promise<T | null>
  deleteMany(args?: { where?: Where }): Promise<DeleteManyResult>
  count(args?: { where?: Where }): Promise<number>

  /**
   * Fields joined onto a record read from this collection. Named after the
   * relation they stand for, so `include: { parent: true }` reads the way the
   * query it replaces read.
   */
  registerRelation(
    name: string,
    resolve: (record: T) => Promise<object | undefined>
  ): void
}

function matches(record: Where, where: Where | undefined): boolean {
  if (where == null) return true
  for (const [field, expected] of Object.entries(where)) {
    // An absent filter is not a filter, which is what lets a caller pass a
    // column it did not narrow rather than build a where clause per case.
    if (expected === undefined) continue
    if (Array.isArray(expected)) {
      if (expected.includes(record[field] as never) === false) return false
      continue
    }
    if (record[field] !== expected) return false
  }
  return true
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === undefined || a === null) return -1
  if (b === undefined || b === null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b)
  }
  return String(a) < String(b) ? -1 : 1
}

function order(
  records: Where[],
  orderBy: OrderBy | undefined
): Where[] {
  if (orderBy == null) return records
  // Insertion order is the tiebreak, so a sort on a non-unique column is
  // still stable between runs and a build's output does not churn.
  return records
    .map((record, index) => ({ record, index }))
    .sort((left, right) => {
      for (const [field, direction] of Object.entries(orderBy)) {
        const result = compare(left.record[field], right.record[field])
        if (result !== 0) return direction === 'desc' ? -result : result
      }
      return left.index - right.index
    })
    .map((entry) => entry.record)
}

function storageFailure(name: string, cause: unknown): IntentError {
  return new IntentError({
    category: 'StorageError',
    message: `cannot access the ${name} collection`,
    detail: cause instanceof Error ? cause.message : String(cause)
  })
}

export function createCollection<T extends { id: string }>(
  store: JsonStore,
  name: string,
  path: string
): Collection<T> {

  const relations = new Map<
    string,
    (record: T) => Promise<Record<string, unknown> | undefined>
  >()

  /**
   * Serializes the read-modify-write of one collection. A build appends to
   * several collections at once, and without this the second append starts
   * from the array the first one had already replaced.
   */
  let queue: Promise<unknown> = Promise.resolve()

  const serialize = <R>(work: () => Promise<R>): Promise<R> => {
    const result = queue.then(work, work)
    // The chain must survive a rejection: this is the only place a store
    // failure surfaces, and a poisoned chain would make every later write
    // fail with the first error instead of its own.
    queue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  const readAll = async (): Promise<T[]> => {
    const records = await store.readIfValid<T[]>(path)
    if (records == null) return []
    if (Array.isArray(records) === false) {
      throw new IntentError({
        category: 'StorageError',
        message: `${path} is not a ${name} collection`
      })
    }
    return records
  }

  const writeAll = async (records: T[]): Promise<void> => {
    await store.write(path, records)
  }

  const withRelations = async (
    records: T[],
    include: Record<string, boolean> | undefined
  ): Promise<T[]> => {

    if (include == null) return records

    const wanted = Object.entries(include)
      .filter(([, enabled]) => enabled === true)
      .map(([relation]) => relation)

    if (wanted.length === 0) return records

    const out: T[] = []
    for (const record of records) {
      // A record that names no relation of this kind comes back without the
      // field rather than with it set to null, which is what a caller
      // checking `if (node.parent)` is testing for.
      const joined: Record<string, unknown> = { ...record }
      for (const relation of wanted) {
        const resolve = relations.get(relation)
        if (resolve == null) continue
        joined[relation] = await resolve(record)
      }
      out.push(joined as T)
    }
    return out
  }

  const findIn = async (
    records: T[],
    where: Where | undefined
  ): Promise<T | null> => {
    for (const record of records) {
      if (matches(record as unknown as Where, where)) return record
    }
    return null
  }

  return {

    name,
    path,

    all: readAll,

    async findMany(args: FindManyArgs = {}): Promise<T[]> {
      let records: T[]
      try {
        records = await readAll()
      } catch (cause) {
        throw storageFailure(name, cause)
      }
      const matched = records.filter(
        (record) => matches(record as unknown as Where, args.where))
      return withRelations(
        order(matched as unknown as Where[], args.orderBy) as T[],
        args.include)
    },

    async findFirst(
      args: FindFirstArgs = {}): Promise<T | null> {
      const found = await this.findMany(args)
      return found[0] ?? null
    },

    async findUnique(
      args: { where: Where; include?: Record<string, boolean> }
    ): Promise<T | null> {
      return this.findFirst({ where: args.where, include: args.include })
    },

    async create(args: CreateArgs<T>): Promise<T> {
      return serialize(async () => {
        const records = await readAll()
        if (args.data.id != null &&
            records.some((record) => record.id === args.data.id)) {

          throw new IntentError({
            category: 'StorageError',
            message: `${name} record ${args.data.id} already exists`
          })
        }
        records.push(args.data)
        await writeAll(records)
        return args.data
      })
    },

    async update(args: UpdateArgs<T>): Promise<T> {
      return serialize(async () => {
        const records = await readAll()
        const index = records.findIndex(
          (record) => matches(record as unknown as Where, args.where))
        if (index < 0) {
          throw new IntentError({
            category: 'StorageError',
            message: `no ${name} record matches the update`
          })
        }
        // A field set to undefined is a field the caller did not name, so it
        // is left alone rather than blanked.
        const updated = { ...records[index] } as Record<string, unknown>
        for (const [field, value] of Object.entries(args.data)) {
          if (value === undefined) continue
          updated[field] = value
        }
        const record = updated as T
        records[index] = record
        await writeAll(records)
        return record
      })
    },

    async upsert(args: UpsertArgs<T>): Promise<T> {
      return serialize(async () => {
        const records = await readAll()
        const index = records.findIndex(
          (record) => matches(record as unknown as Where, args.where))
        if (index < 0) {
          records.push(args.create)
          await writeAll(records)
          return args.create
        }
        const updated = { ...records[index] } as Record<string, unknown>
        for (const [field, value] of Object.entries(args.update)) {
          if (value === undefined) continue
          updated[field] = value
        }
        const record = updated as T
        records[index] = record
        await writeAll(records)
        return record
      })
    },

    async delete(args: { where: Where }): Promise<T | null> {
      return serialize(async () => {
        const records = await readAll()
        const index = records.findIndex(
          (record) => matches(record as unknown as Where, args.where))
        if (index < 0) return null
        const [record] = records.splice(index, 1)
        await writeAll(records)
        return record
      })
    },

    async deleteMany(
      args: { where?: Where } = {}): Promise<DeleteManyResult> {
      return serialize(async () => {
        const records = await readAll()
        const kept = records.filter(
          (record) =>
            matches(record as unknown as Where, args.where) === false)
        const count = records.length - kept.length
        if (count > 0) await writeAll(kept)
        return { count }
      })
    },

    async count(args: { where?: Where } = {}): Promise<number> {
      const records = await this.findMany(args)
      return records.length
    },

    registerRelation(
      relation: string,
      resolve: (record: T) => Promise<Record<string, unknown> | undefined>
    ): void {
      relations.set(relation, resolve)
    }
  }
}
