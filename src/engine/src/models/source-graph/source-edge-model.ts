/**
 * The source graph's edges.
 *
 * An edge says one node implements another. Edges are not read often and are
 * never on a hot path, so they live in their own collection beside the nodes
 * rather than inside a node record.
 */

import type { SourceEdgeWithRelations } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { createId } from '@/core/ids.js'

export class SourceEdgeModel {

  clName = 'SourceEdgeModel'

  async create(
    store: ProjectStore,
    fromId: string,
    toId: string,
    status: string,
    name: string
  ): Promise<SourceEdgeWithRelations> {

    const now = new Date().toISOString()

    return await store.sourceEdges.create({
      data: {
        id: createId(),
        fromId,
        toId,
        status,
        name,
        created: now,
        updated: now
      }
    })
  }

  async deleteById(store: ProjectStore, id: string) {
    return await store.sourceEdges.delete({ where: { id } })
  }

  async deleteByFromId(store: ProjectStore, fromId: string) {
    return await store.sourceEdges.deleteMany({ where: { fromId } })
  }

  async filter(
    store: ProjectStore,
    fromId: string | undefined = undefined,
    toId: string | undefined = undefined,
    status: string | undefined = undefined,
    name: string | undefined = undefined,
    includeFromNodes: boolean = false,
    includeToNodes: boolean = false
  ): Promise<SourceEdgeWithRelations[]> {

    return await store.sourceEdges.findMany({
      where: { fromId, toId, status, name },
      include: {
        ...(includeFromNodes ? { from: true } : {}),
        ...(includeToNodes ? { to: true } : {})
      }
    })
  }

  async getById(
    store: ProjectStore,
    id: string
  ): Promise<SourceEdgeWithRelations | null> {

    return await store.sourceEdges.findFirst({ where: { id } })
  }

  async getByUniqueKey(
    store: ProjectStore,
    fromId: string,
    toId: string,
    name: string
  ): Promise<SourceEdgeWithRelations | null> {

    return await store.sourceEdges.findFirst({
      where: { fromId, toId, name }
    })
  }

  async update(
    store: ProjectStore,
    id: string,
    fromId: string | undefined,
    toId: string | undefined,
    status: string | undefined,
    name: string | undefined
  ) {

    return await store.sourceEdges.update({
      where: { id },
      data: {
        fromId,
        toId,
        status,
        name,
        updated: new Date().toISOString()
      }
    })
  }

  async upsert(
    store: ProjectStore,
    id: string | undefined,
    fromId: string | undefined,
    toId: string | undefined,
    status: string | undefined,
    name: string | undefined
  ) {

    if (id == null &&
        fromId != null &&
        toId != null &&
        name != null) {

      const existing = await this.getByUniqueKey(store, fromId, toId, name)
      if (existing != null) id = existing.id
    }

    if (id != null) {
      return await this.update(store, id, fromId, toId, status, name)
    }

    if (fromId == null || toId == null || status == null || name == null) {
      return null
    }

    return await this.create(store, fromId, toId, status, name)
  }
}
