/**
 * Seeding a project.
 *
 * A project needs three things before it can be built: the agent identities a
 * chat can be held with, the named chat settings those chats use, and a
 * record of the engine version that last touched it. All three are derived
 * from the engine, not chosen by the user, so they are written once and then
 * left alone — a chat started against an agent keeps the agent it started
 * with even after the engine's prompt for it changes.
 */

import { createId } from '@/core/ids.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ServerOnlyTypes, VersionNames } from '@/types/server-only-types.js'
import { VersionModel } from '@/models/engine/version-model.js'
import { AgentUserModel } from '@/models/agents/agent-user-model.js'

// Models
const agentUserModel = new AgentUserModel()
const versionModel = new VersionModel()

// Class
export class SetupService {

  clName = 'SetupService'

  /** The agent identities and the chat settings that name them. */
  async chatSettingsSetup(store: ProjectStore) {

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

  /**
   * Seeds the agents, the chat settings that name them, and the engine
   * version. The bundled extensions are not seeded here: a project takes the
   * ones its deps file names, so loading them is a deliberate act rather than
   * something a run of the engine does to every project it touches.
   */
  async setupProject(store: ProjectStore): Promise<void> {

    await this.chatSettingsSetup(store)

    await versionModel.upsert(
      store,
      undefined,
      VersionNames.engine,
      ServerOnlyTypes.engineVersion)
  }

  /**
   * Seeds the project the command is running in when it has not been seeded
   * yet. Called on every start, so it has to be cheap when there is nothing to
   * do.
   */
  async setupIfRequired(store: ProjectStore): Promise<void> {

    const engine = await versionModel.getByUniqueKey(
      store,
      VersionNames.engine)

    if (engine != null && engine.version === ServerOnlyTypes.engineVersion) {
      return
    }

    // The engine version moved, so the project's agents and chat settings are
    // brought up to date. Both writes leave an existing record alone.
    await this.setupProject(store)
  }

  /** Re-runs every seed, for the Setup command. */
  async setup(store: ProjectStore): Promise<void> {

    await this.setupProject(store)
  }
}
