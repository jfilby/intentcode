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

  const readAll = async (): Promise<T[]> => {

    // Absence and corruption are different things. A collection that has
    // never been written is empty; a collection whose file will not parse is
    // a file whose records are still on disk and must not be treated as an
    // empty collection, because the next create/upsert/deleteMany rewrites
    // the file and every record in it is destroyed with no error and no way
    // back. So the existence check is made here and a file that is present is
    // read strictly: store.read() raises on invalid JSON rather than
    // answering undefined.
    if (!(await store.exists(path))) return []

    const records = await store.read<T[]>(path)

    if (records == null) return []

    if (Array.isArray(records) === false) {
      throw new IntentError({
        category: 'StorageError',
        message: `${path} is not a ${name} collection`
      })
    }

    return records
  }

  /**
   * A read-modify-write of the whole collection, exclusive against every
   * other writer of the file. The read and the write happen inside the store's
   * own lock, so a second store over the same project — or a second engine
   * process — cannot read the array this one is about to replace and write its
   * own stale copy back over the records added since.
   *
   * The check that decides whether the collection is even an array is made
   * here rather than in `readAll`: a file that will not parse is refused
   * before anything is written over the records it holds.
   */
  const mutate = async <R>(
    work: (records: T[]) => { records: T[], result: R } | null
  ): Promise<R | null> => {

    let outcome: R | null = null

    await store.update<T[] | null>(path, (current) => {

      const records = current ?? []

      if (Array.isArray(records) === false) {
        throw new IntentError({
          category: 'StorageError',
          message: `${path} is not a ${name} collection`
        })
      }

      const changed = work(records)

      if (changed == null) return records

      outcome = changed.result
      return changed.records
    })

    return outcome
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

      const created = await mutate((records) => {

        if (args.data.id != null &&
            records.some((record) => record.id === args.data.id)) {

          throw new IntentError({
            category: 'StorageError',
            message: `${name} record ${args.data.id} already exists`
          })
        }

        records.push(args.data)
        return { records, result: args.data }
      })

      return created as T
    },

    async update(args: UpdateArgs<T>): Promise<T> {

      const updated = await mutate((records) => {

        const index = records.findIndex(
          (record) => matches(record as unknown as Where, args.where))

        if (index < 0) {
          throw new IntentError({
            category: 'StorageError',
            message: `no ${name} record matches the update`,
            detail: `${path}: ${JSON.stringify(args.where)}`
          })
        }

        // A field set to undefined is a field the caller did not name, so it
        // is left alone rather than blanked.
        const record = { ...records[index] } as Record<string, unknown>
        for (const [field, value] of Object.entries(args.data)) {
          if (value === undefined) continue
          record[field] = value
        }

        records[index] = record as T
        return { records, result: record as T }
      })

      return updated as T
    },

    async upsert(args: UpsertArgs<T>): Promise<T> {

      const upserted = await mutate((records) => {

        const index = records.findIndex(
          (record) => matches(record as unknown as Where, args.where))

        if (index < 0) {
          records.push(args.create)
          return { records, result: args.create }
        }

        const record = { ...records[index] } as Record<string, unknown>
        for (const [field, value] of Object.entries(args.update)) {
          if (value === undefined) continue
          record[field] = value
        }

        records[index] = record as T
        return { records, result: record as T }
      })

      return upserted as T
    },

    async delete(args: { where: Where }): Promise<T | null> {

      return await mutate<T | null>((records) => {

        const index = records.findIndex(
          (record) => matches(record as unknown as Where, args.where))

        if (index < 0) return null

        const [record] = records.splice(index, 1)
        return { records, result: record }
      })
    },

    async deleteMany(
      args: { where?: Where } = {}): Promise<DeleteManyResult> {

      const count = await mutate<number>((records) => {

        const kept = records.filter(
          (record) =>
            matches(record as unknown as Where, args.where) === false)

        const removed = records.length - kept.length

        // Nothing matched, so the file already says what it should and is
        // left as it is rather than rewritten.
        if (removed === 0) return null

        return { records: kept, result: removed }
      })

      return { count: count ?? 0 }
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
