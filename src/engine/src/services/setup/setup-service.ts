/**
 * Seeding a project.
 *
 * A project needs three things before it can be built: the agent identities a
 * chat can be held with, the named chat settings those chats use, and a
 * record of the engine version that last touched it. All three are derived
 * from the engine, not chosen by the user, so they are written once and then
 * left alone — a chat started against an agent keeps the agent it started
 * with even after the engine's prompt for it changes.
 *
 * The System project is seeded too. It holds the bundled extensions every
 * project inherits from, and it is the one project the engine seeds without
 * being asked.
 */

import { createId } from '@/core/ids.js'
import { IntentError } from '@/core/errors.js'
import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { ServerOnlyTypes, VersionNames } from '@/types/server-only-types.js'
import { VersionModel } from '@/models/engine/version-model.js'
import { AgentUserModel } from '@/models/agents/agent-user-model.js'
import { LoadExternalExtensionsService } from
  '../extensions/extension/load-external-service.js'
import { ProjectRegistryService } from '../projects/project-registry.js'

// Models
const agentUserModel = new AgentUserModel()
const versionModel = new VersionModel()

// Services
const loadExternalExtensionsService = new LoadExternalExtensionsService()
const projectRegistryService = new ProjectRegistryService()

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
   * Seeds the System project: the agents, the chat settings, the engine
   * version, and the bundled extensions the other projects inherit from.
   */
  async setupSystemProject(): Promise<void> {

    const system = projectRegistryService.getSystemProject()
    const store = projectRegistryService.getStore(system)

    await this.chatSettingsSetup(store)

    await versionModel.upsert(
      store,
      undefined,
      VersionNames.engine,
      ServerOnlyTypes.engineVersion)

    await loadExternalExtensionsService.loadBundledExtensions(
      store,
      system.id)
  }

  /**
   * Seeds a user project. The bundled extensions are not copied here: a
   * project reads them from the System project, and copying them is a
   * deliberate action so a project can be pinned to a version.
   */
  async setupProject(store: ProjectStore, projectId: string): Promise<void> {

    await this.chatSettingsSetup(store)

    await versionModel.upsert(
      store,
      undefined,
      VersionNames.engine,
      ServerOnlyTypes.engineVersion)

    void projectId
  }

  /**
   * Seeds the System project when it has not been seeded, and the project the
   * command is running in when there is one. Called on every start, so it has
   * to be cheap when there is nothing to do.
   */
  async setupIfRequired(store: ProjectStore | undefined): Promise<void> {

    await this.setupSystemProject()

    if (store == null) return

    const engine = await versionModel.getByUniqueKey(
      store,
      VersionNames.engine)

    if (engine != null && engine.version === ServerOnlyTypes.engineVersion) {
      return
    }

    // The engine version moved, so the project's agents and chat settings are
    // brought up to date. Both writes leave an existing record alone.
    await this.setupProject(store, '')
  }

  /** Re-runs every seed, for the Setup menu entry. */
  async setup(store: ProjectStore | undefined): Promise<void> {

    if (store == null) {
      throw new IntentError({
        category: 'ProjectError',
        stage: `${this.clName}.setup()`,
        message: 'run this from a project directory: there is nothing to set ' +
          'up outside one'
      })
    }

    await this.setupSystemProject()
    await this.setupProject(store, '')
  }
}
