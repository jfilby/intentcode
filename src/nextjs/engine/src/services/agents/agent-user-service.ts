import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { BaseDataTypes } from '@/types/base-data-types'
import { AgentUserModel } from '@/serene-ai-server/models/agents/agent-user-model'

// Models
const agentUserModel = new AgentUserModel()

// Class
export class AgentUserService {

  // Consts
  clName = 'AgentUserService'

  // Code
  async getDefaultAgentUserForChatSettings(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.getDefaultAgentUserForChatSettings()`

    // Get
    const agentUser = await
            agentUserModel.getByUniqueRefId(
              prisma,
              BaseDataTypes.batchAgentRefId)

    return {
      agentUser: agentUser
    }
  }

  async setup(prisma: PrismaClient) {

    // Debug
    const fnName = `${this.clName}.setup()`

    // Upsert Agent record
    for (const agent of BaseDataTypes.agents) {

      const agentUser = await
              agentUserModel.upsert(
                prisma,
                undefined,                        // id
                agent.agentRefId,
                agent.agentName,
                agent.agentRole,
                10,                               // maxPrevMessages
                null)                             // defaultPrompt

      if (agentUser == null) {
        console.error(`${fnName}: agentUser == null`)
        throw new CustomError(`${fnName}: agentUser == null`)
      }
    }
  }
}
