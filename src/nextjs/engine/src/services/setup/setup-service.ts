import { Instance, PrismaClient, UserProfile } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'
import { UsersService } from '@/serene-core-server/services/users/service'
import { AgentUserModel } from '@/serene-ai-server/models/agents/agent-user-model'
import { AiModelsSelectionService } from './ai-models-selection-service'
import { SereneAiSetup } from '@/serene-ai-server/services/setup/setup-service'
import { BaseDataTypes } from '@/shared/types/base-data-types'
import { ServerOnlyTypes, VersionNames } from '@/types/server-only-types'
import { ServerTestTypes } from '@/types/server-test-types'
import { VersionModel } from '@/models/engine/version-model'
import { AgentUserService } from '@/services/agents/agent-user-service'
import { ProjectsMutateService } from '../projects/mutate-service'
import { ProjectsQueryService } from '../projects/query-service'

// Models
const agentUserModel = new AgentUserModel()
const chatSettingsModel = new ChatSettingsModel()
const versionModel = new VersionModel()

// Services
const agentUserService = new AgentUserService()
const aiModelsSelectionService = new AiModelsSelectionService()
const projectsMutateService = new ProjectsMutateService()
const projectsQueryService = new ProjectsQueryService()
const sereneAiSetup = new SereneAiSetup()
const usersService = new UsersService()

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

  async setup(prisma: PrismaClient) {

    // Get/create an admin user
    const adminUserProfile = await
            usersService.getOrCreateUserByEmail(
              prisma,
              ServerTestTypes.adminUserEmail,
              undefined)  // defaultUserPreferences

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

  async setupIfRequired(prisma: PrismaClient) {

    // Try to get the admin user profile
    const adminUserProfile = await
            usersService.getUserProfileByEmail(
              prisma,
              ServerTestTypes.adminUserEmail)

    // Try to get the System project
    var systemProject: Instance | undefined = undefined

    if (adminUserProfile != null) {

      systemProject = await
        projectsQueryService.getProject(
          prisma,
          null,  // parentId
          ServerOnlyTypes.systemProjectName)
    }

    // Run setup if not found
    if (adminUserProfile == null ||
        systemProject == null) {

      await this.setup(prisma)
    }
  }

  async setupBaseData(
          prisma: PrismaClient,
          adminUserProfile: UserProfile) {

    // Setup project
    const systemProject = await
            projectsMutateService.getOrCreate(
              prisma,
              adminUserProfile.id,
              ServerOnlyTypes.systemProjectName)

    // Setup engine version
    const engineVersion = await
            versionModel.upsert(
              prisma,
              undefined,  // id
              VersionNames.engine,
              ServerOnlyTypes.engineVersion)

    // Setup AI tasks with default models
    await aiModelsSelectionService.setupAiTasksWithDefaults(prisma)
  }
}
