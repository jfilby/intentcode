const fs = require('fs').promises
const path = require('path')
import { PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'
import { AgentUserModel } from '@/serene-ai-server/models/agents/agent-user-model'
import { SereneAiSetup } from '@/serene-ai-server/services/setup/setup-service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { AgentUserService } from '@/services/agents/agent-user-service'
import { ProjectsMutateService } from '../projects/mutate-service'

// Models
const agentUserModel = new AgentUserModel()
const chatSettingsModel = new ChatSettingsModel()

// Services
const agentUserService = new AgentUserService()
const projectsMutateService = new ProjectsMutateService()
const sereneAiSetup = new SereneAiSetup()

// Class
export class SetupService {

  // Consts
  clName = 'SetupService'

  // Services
  async chatSettingsSetup(
          prisma: any,
          userProfileId: string) {

    // Debug
    const fnName = `${this.clName}.chatSettingsSetup()`

    // Debug
    console.log(`${fnName}: upserting ChatSettings record with ` +
                `userProfileId: ${userProfileId}`)

    // Upsert AgentUser records
    await agentUserService.setup(prisma)

    // Upsert ChatSetting records
    for (const chatSetting of BaseDataTypes.chatSettings) {

      // Get the tech and agent for the chat settings
      const agentUser = await
              agentUserModel.getByUniqueRefId(
                prisma,
                chatSetting.agentUniqueRef)

      // Validate
      if (agentUser == null) {
        throw new CustomError(`${fnName}: agentUser == null`)
      }

      // Upsert ChatSettings
      await chatSettingsModel.upsert(
              prisma,
              undefined,  // id
              null,       // baseChatSettingsId
              BaseDataTypes.activeStatus,
              true,       // isEncryptedAtRest
              chatSetting.isJsonMode,
              true,       // isPinned
              chatSetting.name,
              agentUser.id,
              null,       // prompt
              null,       // appCustom
              userProfileId)
    }
  }

  async setup(prisma: PrismaClient,
              adminUserProfile: UserProfile) {

    // Chat settings setup
    await this.chatSettingsSetup(
            prisma,
            adminUserProfile.id)

    // Serene AI setup
    await sereneAiSetup.setup(
            prisma,
            adminUserProfile.id)

    // Setup base data
    await this.setupBaseData(
            prisma,
            adminUserProfile)
  }

  async setupBaseData(
          prisma: PrismaClient,
          adminUserProfile: UserProfile) {

    // Setup a local project
    await projectsMutateService.getOrCreate(
            prisma,
            adminUserProfile.id,
            ServerOnlyTypes.localProjectName)
  }
}
