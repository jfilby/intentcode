/**
 * What a model produced for a node.
 *
 * A generation is kept per (node, model, prompt) so re-running the compiler
 * with a changed prompt does not overwrite the answer to the old one. A build
 * reads the latest generation for a node; the older ones are kept so a prompt
 * change can be compared against what it replaced.
 */

import type { NodeContent, SourceNodeGenerationRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { createId } from '@/core/ids.js'

export class SourceNodeGenerationModel {

  clName = 'SourceNodeGenerationModel'

  async create(
    store: ProjectStore,
    sourceNodeId: string,
    modelId: string,
    temperature: number | null,
    prompt: string,
    promptHash: string,
    content: string | null,
    contentHash: string | null,
    jsonContent: NodeContent | null,
    jsonContentHash: string | null
  ): Promise<SourceNodeGenerationRecord> {

    const now = new Date().toISOString()

    return await store.sourceNodeGenerations.create({
      data: {
        id: createId(),
        sourceNodeId,
        modelId,
        temperature,
        prompt,
        promptHash,
        content,
        contentHash,
        jsonContent,
        jsonContentHash,
        created: now,
        updated: now
      }
    })
  }

  async deleteById(store: ProjectStore, id: string) {
    return await store.sourceNodeGenerations.delete({ where: { id } })
  }

  async deleteBySourceNodeId(store: ProjectStore, sourceNodeId: string) {
    return await store.sourceNodeGenerations.deleteMany({
      where: { sourceNodeId }
    })
  }

  /**
   * Drops every generation for a node except the ones named. A build keeps a
   * fixed number of the most recent and deletes the rest, rather than counting
   * what it is about to keep.
   */
  async deleteNotInAndSourceNodeId(
    store: ProjectStore,
    keepIds: string[],
    sourceNodeId: string
  ) {

    const kept = new Set(keepIds)

    // The collection is small enough to name what to drop rather than what
    // to keep, which is the only direction that works when several of the
    // records share the node they belong to.
    const stale = (await store.sourceNodeGenerations.findMany({
      where: { sourceNodeId }
    })).filter((record) => kept.has(record.id) === false)

    for (const record of stale) {
      await store.sourceNodeGenerations.delete({ where: { id: record.id } })
    }

    return { count: stale.length }
  }

  async filter(
    store: ProjectStore,
    modelId: string | undefined = undefined
  ): Promise<SourceNodeGenerationRecord[]> {

    return await store.sourceNodeGenerations.findMany({
      where: { modelId },
      orderBy: { created: 'asc' }
    })
  }

  async getById(
    store: ProjectStore,
    id: string
  ): Promise<SourceNodeGenerationRecord | null> {

    return await store.sourceNodeGenerations.findFirst({ where: { id } })
  }

  async getByUniqueKey(
    store: ProjectStore,
    sourceNodeId: string,
    modelId: string,
    promptHash: string
  ): Promise<SourceNodeGenerationRecord | null> {

    return await store.sourceNodeGenerations.findFirst({
      where: { sourceNodeId, modelId, promptHash }
    })
  }

  /** The most recent generations for a node, newest first. */
  async getLatestForSourceNodeId(
    store: ProjectStore,
    count: number,
    sourceNodeId: string
  ): Promise<SourceNodeGenerationRecord[]> {

    const matched = await store.sourceNodeGenerations.findMany({
      where: { sourceNodeId },
      orderBy: { created: 'desc' }
    })

    return matched.slice(0, count)
  }

  async update(
    store: ProjectStore,
    id: string,
    sourceNodeId: string | undefined,
    modelId: string | undefined,
    temperature: number | null | undefined,
    prompt: string | undefined,
    promptHash: string | undefined,
    content: string | null | undefined,
    contentHash: string | null | undefined,
    jsonContent: NodeContent | null,
    jsonContentHash: string | null | undefined
  ) {

    return await store.sourceNodeGenerations.update({
      where: { id },
      data: {
        sourceNodeId,
        modelId,
        temperature,
        prompt,
        promptHash,
        content,
        contentHash,
        jsonContent,
        jsonContentHash,
        updated: new Date().toISOString()
      }
    })
  }

  async upsert(
    store: ProjectStore,
    id: string | undefined,
    sourceNodeId: string | undefined,
    modelId: string | undefined,
    temperature: number | null | undefined,
    prompt: string | undefined,
    promptHash: string | undefined,
    content: string | null | undefined,
    contentHash: string | null | undefined,
    jsonContent: NodeContent | null,
    jsonContentHash: string | null | undefined
  ) {

    if (id == null &&
        sourceNodeId != null &&
        modelId != null &&
        promptHash != null) {

      const existing =
        await this.getByUniqueKey(store, sourceNodeId, modelId, promptHash)
      if (existing != null) id = existing.id
    }

    if (id != null) {
      return await this.update(
        store, id, sourceNodeId, modelId, temperature, prompt, promptHash,
        content, contentHash, jsonContent, jsonContentHash)
    }

    if (sourceNodeId == null ||
        modelId == null ||
        temperature === undefined ||
        prompt == null ||
        promptHash == null) {

      return null
    }

    // A field the caller did not name is undefined here, and create stores
    // null for "no value". The defaults keep the two spellings of absence
    // from reaching the record as different things.
    return await this.create(
      store, sourceNodeId, modelId, temperature, prompt, promptHash,
      content ?? null,
      contentHash ?? null,
      jsonContent,
      jsonContentHash ?? null)
  }
}
