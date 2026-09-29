/**
 * The agent identities a chat can be held with.
 *
 * There are a fixed few, defined by the engine rather than by a user, and a
 * chat refers to one by its ref id. Storing them rather than deriving them
 * means a chat keeps working when an agent's prompt changes: the session
 * records the agent it was started with.
 */

import type { AgentUserRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { createId } from '@/core/ids.js'

export class AgentUserModel {

  clName = 'AgentUserModel'

  async getByUniqueRefId(
    store: ProjectStore,
    uniqueRefId: string
  ): Promise<AgentUserRecord | null> {

    return await store.agents.findFirst({ where: { uniqueRefId } })
  }

  async filter(
    store: ProjectStore,
    uniqueRefId: string | undefined = undefined
  ): Promise<AgentUserRecord[]> {

    return await store.agents.findMany({ where: { uniqueRefId } })
  }

  /**
   * Writes the agent if it is not there, and otherwise leaves the stored
   * record alone. An agent's prompt is the engine's to change, and a stored
   * one is what an existing chat was started with, so a setup pass must not
   * rewrite it under a running session.
   */
  async upsert(
    store: ProjectStore,
    uniqueRefId: string,
    name: string,
    role: string,
    maxPrevMessages: number | null = null,
    defaultPrompt: string | null = null
  ): Promise<AgentUserRecord> {

    const existing = await this.getByUniqueRefId(store, uniqueRefId)

    if (existing != null) return existing

    return await store.agents.create({
      data: {
        id: createId(),
        uniqueRefId,
        name,
        role,
        maxPrevMessages,
        defaultPrompt
      }
    })
  }
}
