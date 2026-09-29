/**
 * The source graph's nodes.
 *
 * A node is one thing the engine knows about a project: a spec file, a piece
 * of indexed source, a build, a directory, an extension. Which kind it is
 * lives in `type`, so one collection holds the whole graph rather than a
 * table per kind.
 */

import { IntentError } from '@/core/errors.js'
import type { NodeContent, SourceNodeWithRelations } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { createId } from '@/core/ids.js'

const ORDER_BY_UNIQUE_KEY = {
  parentId: 'asc',
  projectId: 'asc',
  type: 'asc',
  name: 'asc'
} as const

export class SourceNodeModel {

  clName = 'SourceNodeModel'

  async create(
    store: ProjectStore,
    parentId: string | null,
    projectId: string,
    status: string,
    type: string,
    name: string,
    content: string | null,
    contentHash: string | null,
    jsonContent: NodeContent | null,
    jsonContentHash: string | null,
    contentUpdated: Date | null
  ): Promise<SourceNodeWithRelations> {

    if (name == null || name.length === 0) {
      throw new IntentError({
        category: 'ValidationError',
        stage: `${this.clName}.create()`,
        message: 'name.length === 0'
      })
    }

    const now = new Date().toISOString()

    return await store.sourceNodes.create({
      data: {
        id: createId(),
        parentId,
        projectId,
        status,
        type,
        name,
        content,
        contentHash,
        jsonContent,
        jsonContentHash,
        contentUpdated: contentUpdated?.toISOString() ?? null,
        created: now,
        updated: now
      }
    })
  }

  /** A record that is already gone is not a failure; nothing depends on it. */
  async deleteById(store: ProjectStore, id: string) {
    return await store.sourceNodes.delete({ where: { id } })
  }

  async deleteByProjectId(store: ProjectStore, projectId: string) {
    return await store.sourceNodes.deleteMany({ where: { projectId } })
  }

  async filter(
    store: ProjectStore,
    parentId: string | null | undefined = undefined,
    projectId: string | undefined = undefined,
    type: string | undefined = undefined,
    name: string | undefined = undefined,
    contentHash: string | null | undefined = undefined,
    jsonContentHash: string | null | undefined = undefined,
    orderByUniqueKey: boolean = false
  ): Promise<SourceNodeWithRelations[]> {

    return await store.sourceNodes.findMany({
      where: {
        parentId,
        projectId,
        type,
        name,
        contentHash,
        jsonContentHash
      },
      orderBy: orderByUniqueKey ? ORDER_BY_UNIQUE_KEY : undefined
    })
  }

  /**
   * Nodes of one type with their children of the given types attached. The
   * graph services read a directory and its entries in one call rather than
   * one call per directory.
   */
  async filterWithChildNodes(
    store: ProjectStore,
    projectId: string | undefined = undefined,
    type: string | undefined = undefined,
    childTypes: string[] | undefined
  ): Promise<SourceNodeWithRelations[]> {

    const parents = await store.sourceNodes.findMany({
      where: { projectId, type }
    })

    const out: SourceNodeWithRelations[] = []

    for (const parent of parents) {
      const children = childTypes == null
        ? []
        : await store.sourceNodes.findMany({
          where: { parentId: parent.id, type: childTypes }
        })
      out.push({ ...parent, children })
    }

    return out
  }

  async getById(
    store: ProjectStore,
    id: string
  ): Promise<SourceNodeWithRelations | null> {

    return await store.sourceNodes.findFirst({ where: { id } })
  }

  /**
   * The node a set of names identifies. `parentId` is part of the key, so a
   * name may repeat under different parents, and `null` is a real value here:
   * a root node has no parent, and undefined would mean "any parent".
   */
  async getByUniqueKey(
    store: ProjectStore,
    parentId: string | null,
    projectId: string,
    type: string,
    name: string
  ): Promise<SourceNodeWithRelations | null> {

    if (parentId === undefined ||
        projectId == null ||
        type == null ||
        name == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: `${this.clName}.getByUniqueKey()`,
        message: 'a node key needs a parentId, projectId, type and name'
      })
    }

    return await store.sourceNodes.findFirst({
      where: { parentId, projectId, type, name }
    })
  }

  async getJsonContentByParentIdAndType(
    store: ProjectStore,
    parentId: string,
    type: string,
    includeParent: boolean = false,
    orderByUniqueKey: boolean = false
  ): Promise<SourceNodeWithRelations[]> {

    return await store.sourceNodes.findMany({
      where: { parentId, type },
      orderBy: orderByUniqueKey ? { name: 'asc' } : undefined,
      include: includeParent ? { parent: true } : undefined
    })
  }

  /**
   * Nodes of a type, newest first, past the ones a build already has. Used to
   * age out old records without counting them in memory first.
   */
  async getOldest(
    store: ProjectStore,
    parentId: string,
    type: string,
    latestRecordsIgnored: number
  ): Promise<SourceNodeWithRelations[]> {

    const matched = await store.sourceNodes.findMany({
      where: { parentId, type },
      orderBy: { created: 'desc' }
    })

    return matched.slice(latestRecordsIgnored)
  }

  async setJsonContent(
    store: ProjectStore,
    id: string,
    jsonContent: NodeContent | null,
    jsonContentHash: string | null | undefined
  ) {

    return await store.sourceNodes.update({
      where: { id },
      data: {
        jsonContent,
        jsonContentHash,
        contentUpdated: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    })
  }

  async update(
    store: ProjectStore,
    id: string,
    parentId: string | null | undefined,
    projectId: string | undefined,
    status: string | undefined,
    type: string | undefined,
    name: string | undefined,
    content: string | null | undefined,
    contentHash: string | null | undefined,
    jsonContent: NodeContent | null,
    jsonContentHash: string | null | undefined,
    contentUpdated: Date | null | undefined
  ) {

    if (name != null && name.length === 0) {
      throw new IntentError({
        category: 'ValidationError',
        stage: `${this.clName}.update()`,
        message: 'name.length === 0'
      })
    }

    return await store.sourceNodes.update({
      where: { id },
      data: {
        parentId,
        projectId,
        status,
        type,
        name,
        content,
        contentHash,
        jsonContent,
        jsonContentHash,
        contentUpdated: contentUpdated?.toISOString(),
        updated: new Date().toISOString()
      }
    })
  }

  /**
   * Writes the node named by the key, creating it when there is none. A
   * caller that knows only the key passes no id; one that has read the node
   * passes its id and updates it directly.
   */
  async upsert(
    store: ProjectStore,
    id: string | undefined,
    parentId: string | null | undefined,
    projectId: string | undefined,
    status: string | undefined,
    type: string | undefined,
    name: string | undefined,
    content: string | null | undefined,
    contentHash: string | null | undefined,
    jsonContent: NodeContent | null,
    jsonContentHash: string | null | undefined,
    contentUpdated: Date | null | undefined
  ) {

    if (id == null &&
        parentId !== undefined &&
        projectId !== undefined &&
        type != null &&
        name != null) {

      const existing = await this.getByUniqueKey(
        store, parentId, projectId, type, name)
      if (existing != null) id = existing.id
    }

    if (id != null) {
      return await this.update(
        store, id, parentId, projectId, status, type, name, content,
        contentHash, jsonContent, jsonContentHash, contentUpdated)
    }

    if (parentId === undefined ||
        projectId === undefined ||
        status == null ||
        type == null ||
        name == null) {

      throw new IntentError({
        category: 'ValidationError',
        stage: `${this.clName}.upsert()`,
        message: 'creating a node needs a parentId, projectId, status, type ' +
          'and name',
        detail: `got parentId: ${String(parentId)}, ` +
          `projectId: ${String(projectId)}, status: ${String(status)}, ` +
          `type: ${String(type)}, name: ${String(name)}`
      })
    }

    // A field the caller did not name is undefined here, and create stores
    // null for "no value". The defaults keep the two spellings of absence
    // from reaching the record as different things.
    return await this.create(
      store, parentId, projectId, status, type, name,
      content ?? null,
      contentHash ?? null,
      jsonContent,
      jsonContentHash ?? null,
      contentUpdated ?? null)
  }
}
