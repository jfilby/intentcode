import type { ProjectStore } from '@/core/store.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { AgentUserModel } from '@/models/agents/agent-user-model.js'

// Models
const agentUserModel = new AgentUserModel()

// Class
export class AgentUserService {

  // Consts
  clName = 'AgentUserService'

  // Code
  async getDefaultAgentUserForChatSettings(store: ProjectStore) {

    // Debug
    const fnName = `${this.clName}.getDefaultAgentUserForChatSettings()`

    // Get
    const agentUser = await
            agentUserModel.getByUniqueRefId(
              store,
              BaseDataTypes.batchAgentRefId)

    // Return
    return {
      agentUser: agentUser
    }
  }

  // The agents the engine defines, written into the project's store. A stored
  // agent is left alone, so a chat started against one keeps the prompt it
  // started with.
  async setup(store: ProjectStore) {

    // Debug
    const fnName = `${this.clName}.setup()`

    // Upsert Agent records
    for (const agent of BaseDataTypes.agents) {

      await
              agentUserModel.upsert(
                store,
                agent.agentRefId,
                agent.agentName,
                agent.agentRole,
                BaseDataTypes.maxPrevMessages,
                null)                           // defaultPrompt
    }
  }
}
