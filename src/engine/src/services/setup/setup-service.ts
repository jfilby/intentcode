/**
 * Seeding a project.
 *
 * A project needs two things before it can be built: the agent identities a
 * chat can be held with, and the named chat settings those chats use. Both
 * are derived from the engine, not chosen by the user, so they are written
 * once and then left alone — a chat started against an agent keeps the agent
 * it started with even after the engine's prompt for it changes.
 *
 * Every write here is insert-if-missing, which is what lets this run on every
 * command without a marker recording whether it ran before: a pass over a
 * seeded project writes nothing, so there is no state to keep in step with
 * the engine. The bundled extensions are not seeded either: a project takes
 * the ones its deps file names, so loading them is a deliberate act rather
 * than something a run of the engine does to every project it touches.
 */

import { createId } from '@/core/ids.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { AgentUserModel } from '@/models/agents/agent-user-model.js'

// Models
const agentUserModel = new AgentUserModel()

// Class
export class SetupService {

  clName = 'SetupService'

  /**
   * Seeds the agents and the chat settings that name them. Safe to call on
   * every command: a record that is already there is left exactly as it is.
   */
  async setup(store: ProjectStore): Promise<void> {

    for (const agent of BaseDataTypes.agents) {

      await agentUserModel.upsert(
        store,
        agent.agentRefId,
        agent.agentName,
        agent.agentRole,
        BaseDataTypes.maxPrevMessages,
        null)  // defaultPrompt
    }

    for (const settings of BaseDataTypes.chatSettings) {

      // The settings name an agent by its ref id, which is what the agent
      // record is written under above.
      const existing = await store.chatSettings.findFirst({
        where: { name: settings.name }
      })

      if (existing != null) continue

      await store.chatSettings.create({
        data: {
          id: createId(),
          name: settings.name,
          agentUniqueRefId: settings.agentUniqueRef,
          isJsonMode: settings.isJsonMode,
          prompt: null,
          appCustom: null
        }
      })
    }
  }
}
