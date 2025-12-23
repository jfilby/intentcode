import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { SereneCoreServerTypes } from '@/serene-core-server/types/user-types'
import { ChatSessionModel } from '@/serene-core-server/models/chat/chat-session-model'
import { ChatSettingsModel } from '@/serene-core-server/models/chat/chat-settings-model'
import { ResourceQuotaTotalModel } from '@/serene-core-server/models/quotas/resource-quota-total-model'
import { ResourceQuotaUsageModel } from '@/serene-core-server/models/quotas/resource-quota-usage-model'
import { TechModel } from '@/serene-core-server/models/tech/tech-model'
import { ResourceQuotasQueryService } from '@/serene-core-server/services/quotas/query-service'
import { AiTechDefs } from '../../../types/tech-defs'
import { SereneAiServerOnlyTypes } from '../../../types/server-only-types'
import { AgentsService } from '../../agents/agents-service'
import { ChatService } from '../../llm-apis/chat-service'
import { ChatMessageService } from '../../chats/messages/service'

export class TestLlmService {

  // Consts
  clName = 'TestLlmService'

  agentUniqueRefId = `Serene AI|Test agent`
  agentName = `Test agent`
  agentRole = 'Testing'

  // Test classes aren't typically called, thus the class instances used are
  // within the class.

  // Models
  chatSessionModel = new ChatSessionModel()
  chatSettingsModel = new ChatSettingsModel()
  techModel = new TechModel()
  resourceQuotaTotalModel = new ResourceQuotaTotalModel()
  resourceQuotaUsageModel = new ResourceQuotaUsageModel()

  // Services
  agentsService = new AgentsService()
  chatService = new ChatService()
  chatMessageService = new ChatMessageService()
  resourceQuotasQueryService = new ResourceQuotasQueryService()

  // Code
  async createTestChatSession(
          prisma: PrismaClient,
          userProfileId: string,
          instanceId: string | null) {

    // Debug
    const fnName = `${this.clName}.createTestChatSession()`

    // Get ChatSettings
    const chatSettingsName = SereneAiServerOnlyTypes.defaultChatSettingsName

    const chatSettings = await
            this.chatSettingsModel.getByName(
              prisma,
              chatSettingsName)

    if (chatSettings == null) {
      throw new CustomError(`${fnName}: chatSettings == null for ` +
                            chatSettingsName)
    }

    // Create a ChatSession
    const chatSession = await
            this.chatSessionModel.create(
              prisma,
              undefined,  // id
              chatSettings.id,
              instanceId,
              SereneAiServerOnlyTypes.activeStatus,
              false,      // isEncryptedAtRest
              null,       // name
              null,       // externalIntegration
              null,       // externalId
              userProfileId)  // createdById

    // Return
    return chatSession
  }

  async prepCreditsAndUsageAtStart(
          prisma: PrismaClient,
          adminUserProfile: any,
          regularTestUserProfile: any) {

    // Delete credit and usage records for the admin user (shouldn't exist)
    await this.resourceQuotaTotalModel.deleteByUserProfileId(
            prisma,
            adminUserProfile.id)

    await this.resourceQuotaUsageModel.deleteByUserProfileId(
            prisma,
            adminUserProfile.id)

    // Delete credit and usage records for the regular test user
    await this.resourceQuotaTotalModel.deleteByUserProfileId(
            prisma,
            regularTestUserProfile.id)

    await this.resourceQuotaUsageModel.deleteByUserProfileId(
            prisma,
            regularTestUserProfile.id)
  }

  async prepCreditsAndUsageForUse(
          prisma: PrismaClient,
          regularTestUserProfile: any) {

    // Inc credits by 10.0 for the test user (until tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    var resourceQuotaTotal = await
          this.resourceQuotaTotalModel.create(
            prisma,
            regularTestUserProfile,
            SereneCoreServerTypes.credits,
            new Date(),
            tomorrow,
            10.0)  // quota
  }

  async test(
          prisma: PrismaClient,
          adminUserProfile: any,
          regularTestUserProfile: any) {

    // Prep credits and usage at the start
    await this.prepCreditsAndUsageAtStart(
            prisma,
            adminUserProfile,
            regularTestUserProfile)

    // Define the test messages
    const messagesWithRoles: any[] = [
      {
        role: 'user',
        parts: [
          {
            type: '',
            text: 'Testing..'
          }
        ]
      }
    ]

    // Free LLM test
    await this.testFree(
            prisma,
            adminUserProfile,
            messagesWithRoles)

    await this.testFree(
            prisma,
            regularTestUserProfile,
            messagesWithRoles)

    // Paid LLM test
    await this.testPaid(
            prisma,
            adminUserProfile,
            messagesWithRoles)

    await this.testPaid(
            prisma,
            regularTestUserProfile,
            messagesWithRoles)

    // Return
    return {
      status: true
    }
  }

  async testFree(
          prisma: PrismaClient,
          userProfile: any,
          messagesWithRoles: any[]) {

    // Debug
    const fnName = `${this.clName}.testFree()`

    // Get a free LLM variant
    const variantName = AiTechDefs.mockedLlmFree

    // Load the tech record
    const llmTech = await
            this.techModel.getByVariantName(
              prisma,
              variantName)

    if (llmTech == null) {
      throw new CustomError(`${fnName}: llmTech == null for variantName: ` +
                            variantName)
    }

    // Get or create agent
    const agentUser = await
            this.agentsService.getOrCreate(
              prisma,
              this.agentUniqueRefId,
              this.agentName,
              this.agentRole,
              null)

    // Get pre credits and usage
    const adminUserQuotaAndUsage1 = await
            this.resourceQuotasQueryService.getQuotaAndUsage(
              prisma,
              userProfile.id,
              SereneCoreServerTypes.credits,
              new Date())

    // Call a free LLM variant in test mode with the admin user
    const adminUserChatSession = await
            this.createTestChatSession(
              prisma,
              userProfile.id,
              null)  // instanceId

    // Try LLM request
    const llmRequestResults1 = await
            this.chatService.llmRequest(
              prisma,
              llmTech.id,
              adminUserChatSession,
              userProfile,
              agentUser,
              messagesWithRoles)

    // Validate
    if (llmRequestResults1.status === false) {
      throw new CustomError(`${fnName}: failed: ${llmRequestResults1.message}`)
    }

    // Get post credits and usage
    const adminUserQuotaAndUsage2 = await
            this.resourceQuotasQueryService.getQuotaAndUsage(
              prisma,
              userProfile.id,
              SereneCoreServerTypes.credits,
              new Date())

    // Validate admin user usage had no inc
    if (adminUserQuotaAndUsage1.usage !== adminUserQuotaAndUsage2.usage) {

      throw new CustomError(
                  `${fnName}: admin user/free: pre usage: ` +
                  `${adminUserQuotaAndUsage1.usage} ` +
                  `!= post usage: ${adminUserQuotaAndUsage2.usage}`)
    }

    // Get pre credits and usage
    const quotaAndUsage1 = await
            this.resourceQuotasQueryService.getQuotaAndUsage(
              prisma,
              userProfile.id,
              SereneCoreServerTypes.credits,
              new Date())

    // Call a free LLM variant in test mode with the test user
    const chatSession = await
            this.createTestChatSession(
              prisma,
              userProfile.id,
              null)  // instanceId

    // Try LLM request
    const llmRequestResults2 = await
            this.chatService.llmRequest(
              prisma,
              llmTech.id,
              chatSession,
              userProfile,
              agentUser,
              messagesWithRoles)

    // Validate
    if (llmRequestResults2.status === false) {
      throw new CustomError(`${fnName}: failed: ${llmRequestResults2.message}`)
    }

    // Get post credits and usage
    const quotaAndUsage2 = await
            this.resourceQuotasQueryService.getQuotaAndUsage(
              prisma,
              userProfile.id,
              SereneCoreServerTypes.credits,
              new Date())

    // Validate regular test user usage had no inc
    if (quotaAndUsage1.usage !==
        quotaAndUsage2.usage) {

      throw new CustomError(
                  `${fnName}: regular test user/free: pre usage: ` +
                  `${quotaAndUsage1.usage} ` +
                  `!= post usage: ${quotaAndUsage2.usage}`)
    }
  }

  async testPaid(
          prisma: PrismaClient,
          userProfile: any,
          messagesWithRoles: any[]) {

    // Debug
    const fnName = `${this.clName}.testPaid()`

    // Get a paid LLM variant
    const variantName = AiTechDefs.mockedLlmPaid

    // Load the tech record
    const llmTech = await
            this.techModel.getByVariantName(
              prisma,
              variantName)

    if (llmTech == null) {
      throw new CustomError(`${fnName}: llmTech == null for variantName: ` +
                            variantName)
    }

    // Get or create agent
    const agentUser = await
            this.agentsService.getOrCreate(
              prisma,
              this.agentUniqueRefId,
              this.agentName,
              this.agentRole,
              null)

    // Get pre credits and usage
    const quotaAndUsage1 = await
            this.resourceQuotasQueryService.getQuotaAndUsage(
              prisma,
              userProfile.id,
              SereneCoreServerTypes.credits,
              new Date())

    // Call a paid LLM variant in test mode with the admin user
    const chatSession = await
            this.createTestChatSession(
              prisma,
              userProfile.id,
              null)  // instanceId

    // Try LLM request
    var llmRequestResults = await
          this.chatService.llmRequest(
            prisma,
            llmTech.id,
            chatSession,
            userProfile,
            agentUser,
            messagesWithRoles)

    // Validate
    if (llmRequestResults.status === true) {
      throw new CustomError(`${fnName}: should have failed due to insufficient quota`)
    }

    // Add credits
    await this.prepCreditsAndUsageForUse(
            prisma,
            userProfile.id)

    // Try LLM request (again)
    llmRequestResults = await
      this.chatService.llmRequest(
        prisma,
        llmTech.id,
        chatSession,
        userProfile,
        agentUser,
        messagesWithRoles)

    if (llmRequestResults.status === false) {

      throw new CustomError(
                  `${fnName}: for userProfileId: ${userProfile.id}: ` +
                  `message: ${llmRequestResults.message}`)
    }

    // Get post credits and usage
    const quotaAndUsage2 = await
            this.resourceQuotasQueryService.getQuotaAndUsage(
              prisma,
              userProfile.id,
              SereneCoreServerTypes.credits,
              new Date())

    // Validate regular test user usage had no inc
    if (quotaAndUsage1.usage !==
        quotaAndUsage2.usage) {

      throw new CustomError(
                  `${fnName}: regular test user/free: pre usage: ` +
                  `${quotaAndUsage1.usage} ` +
                  `!= post usage: ${quotaAndUsage2.usage}`)
    }
  }
}
