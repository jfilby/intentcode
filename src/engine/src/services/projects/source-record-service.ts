/**
 * What the engine last saw of a project's source.
 *
 * A session writes the source files, and the graph has to remember enough to
 * tell whether what is on disk is still what was written. That record cannot
 * live under a build: every build grows its own source subtree and the old ones
 * are aged out, so a record kept there is deleted before anything can compare
 * against it. It is kept on the project node instead, which is the one node
 * that outlives a build.
 *
 * The record is a map from a project-relative source path to the two hashes
 * that say whether a file is in step: the Intent it answered, and its own
 * content as last written. A path absent from the map is one the engine has
 * never seen written.
 */

import { blake3 } from '@noble/hashes/blake3'
import { hashContent } from '@/core/content-hash.js'
import { IntentError } from '@/core/errors.js'
import type { NodeContent, SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'

/** What the engine recorded about one source file. */
export interface SourceRecord {
  /** The hash of the Intent this source answered. */
  intentContentHash: string
  /** The hash of the source as it was last written. */
  contentHash: string
}

export class SourceRecordService {

  // Consts
  clName = 'SourceRecordService'

  // The key the record is held under on the project node.
  private recordKey = `sourceRecords`

  // Code

  /**
   * What the engine has recorded for every source file it has written.
   *
   * The node is re-read rather than taken from the caller: the caller is
   * usually holding the record as it was before a compile wrote to it, and
   * reading that would report a file as unrecorded immediately after it was
   * recorded.
   */
  async getRecords(
          store: ProjectStore,
          projectNode: SourceNodeRecord): Promise<Record<string, SourceRecord>> {

    const current =
      await new SourceNodeModel().getById(store, projectNode.id) ??
      projectNode

    const records = this.getRecordContainer(current.jsonContent)
    const out: Record<string, SourceRecord> = {}

    for (const [path, value] of Object.entries(records)) {

      if (value == null || typeof value !== 'object') continue

      const record = value as Partial<SourceRecord>

      if (typeof record.intentContentHash !== 'string' ||
          typeof record.contentHash !== 'string') {

        continue
      }

      out[path] = {
        intentContentHash: record.intentContentHash,
        contentHash: record.contentHash
      }
    }

    return out
  }

  /** What the engine recorded about one source file, if anything. */
  async getRecord(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          sourceRelativePath: string): Promise<SourceRecord | undefined> {

    return (await this.getRecords(store, projectNode))[sourceRelativePath]
  }

  /**
   * Whether the source file is exactly what the engine last wrote for exactly
   * this Intent: recorded, answering the Intent as it reads now, and still on
   * disk unchanged.
   *
   * This is the negation of every drift finding, decided from the same record
   * in the same order `DriftService` decides them, so a build cannot skip a
   * file the drift check would call out, or recompile one it would call
   * settled. Anything short of all three — no record, a changed Intent, a
   * missing or edited source — compiles, which is what the engine did before
   * this existed.
   */
  async isUpToDate(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          sourceRelativePath: string,
          intentContent: string,
          sourceContent: string | null): Promise<boolean> {

    const record = await this.getRecord(
      store, projectNode, sourceRelativePath)

    // Never written, as far as the engine knows
    if (record == null) return false

    // The Intent has moved on since the source was written
    if (record.intentContentHash !== hashContent(intentContent)) return false

    // No source on disk to be up to date about
    if (sourceContent == null) return false

    // The source on disk has moved on since the engine recorded it
    return record.contentHash === hashContent(sourceContent)
  }

  /**
   * Record a source file as written. A path already recorded is replaced, so
   * the record always describes the file as it is now.
   *
   * The node is re-read before the write as well as before the read. A build
   * resolves its project once and then compiles every Intent file against that
   * one snapshot, so writing back what the caller holds would replace the
   * records of the files already compiled with a copy taken before any of
   * them ran — leaving a project with as many records as it has Intent files
   * to exactly one.
   */
  async setRecord(
          store: ProjectStore,
          projectNode: SourceNodeRecord,
          sourceRelativePath: string,
          record: SourceRecord) {

    const current =
      await new SourceNodeModel().getById(store, projectNode.id) ??
      projectNode

    const jsonContent = { ...(current.jsonContent ?? {}) }

    const records = { ...this.getRecordContainer(jsonContent) }

    records[sourceRelativePath] = record

    jsonContent[this.recordKey] = records

    await this.writeRecords(store, current, jsonContent)
  }

  /** The record map, read defensively: an older node may not have one. */
  private getRecordContainer(jsonContent: NodeContent | null) {

    if (jsonContent == null || !(this.recordKey in jsonContent)) return {}

    const records = jsonContent[this.recordKey]

    if (records == null ||
        typeof records !== 'object' ||
        Array.isArray(records)) {

      return {}
    }

    return records as Record<string, unknown>
  }

  private async writeRecords(
            store: ProjectStore,
            projectNode: SourceNodeRecord,
            jsonContent: NodeContent) {

    const updated = await
      new SourceNodeModel().upsert(
        store,
        projectNode.id,  // id
        projectNode.parentId,
        projectNode.projectId,
        projectNode.status,
        projectNode.type,
        projectNode.name,
        projectNode.content,
        projectNode.contentHash,
        jsonContent,
        blake3(JSON.stringify(jsonContent)).toString(),
        null)

    if (updated == null) {

      throw new IntentError({
        category: 'StorageError',
        stage: `${this.clName}.writeRecords()`,
        message: `could not write the source records`
      })
    }
  }
}
