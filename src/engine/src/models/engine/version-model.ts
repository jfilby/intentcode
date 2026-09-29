/**
 * What the engine recorded about its own version.
 *
 * One record per named version, so a project records the engine version that
 * last built it and the CLI can tell when that is older than the one running.
 */

import type { VersionRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { createId } from '@/core/ids.js'

export class VersionModel {

  clName = 'VersionModel'

  async create(
    store: ProjectStore,
    name: string,
    version: string
  ): Promise<VersionRecord> {

    return await store.versions.create({
      data: { id: createId(), name, version }
    })
  }

  async delete(store: ProjectStore, id: string) {
    return await store.versions.delete({ where: { id } })
  }

  async filter(
    store: ProjectStore,
    name: string | undefined = undefined
  ): Promise<VersionRecord[]> {

    return await store.versions.findMany({ where: { name } })
  }

  async getById(
    store: ProjectStore,
    id: string
  ): Promise<VersionRecord | null> {

    return await store.versions.findFirst({ where: { id } })
  }

  async getByUniqueKey(
    store: ProjectStore,
    name: string
  ): Promise<VersionRecord | null> {

    return await store.versions.findFirst({ where: { name } })
  }

  async update(
    store: ProjectStore,
    id: string,
    name: string | undefined,
    version: string | undefined
  ) {

    return await store.versions.update({
      where: { id },
      data: { name, version }
    })
  }

  async upsert(
    store: ProjectStore,
    id: string | undefined,
    name: string | undefined,
    version: string | undefined
  ) {

    if (id == null && name != null) {
      const existing = await this.getByUniqueKey(store, name)
      if (existing != null) id = existing.id
    }

    if (id != null) return await this.update(store, id, name, version)
    if (name == null || version == null) return null

    return await this.create(store, name, version)
  }
}
