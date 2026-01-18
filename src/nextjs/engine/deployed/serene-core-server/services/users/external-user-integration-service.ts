import { PrismaClient } from '@prisma/client'
import { ExternalUserIntegrationModel } from '../../models/users/external-user-integration-model'
import { UserProfileModel } from '../../models/users/user-profile-model'

export class ExternalUserIntegrationService {

  // Consts
  clName = 'ExternalUserIntegrationService'

  // Models
  externalUserIntegrationModel = new ExternalUserIntegrationModel()
  userProfileModel = new UserProfileModel()

  // Code
  async getOrCreate(
          prisma: PrismaClient,
          externalIntegrationUserId: string,
          externalIntegration: string) {

    // Try to get ExternalUserIntegration record
    var externalUserIntegration = await
          this.externalUserIntegrationModel.getByUniqueKey(
            prisma,
            externalIntegrationUserId,
            externalIntegration)

    // If found
    if (externalUserIntegration != null) {

      return externalUserIntegration.userProfileId
    }

    // Create UserProfile record
    const userProfile = await
            this.userProfileModel.create(
              prisma,
              null,       // userId
              false,      // isAdmin
              null)       // deletePending

    // Create ExternalUserIntegration record
    externalUserIntegration = await
      this.externalUserIntegrationModel.create(
        prisma,
        userProfile.id,
        externalIntegrationUserId,
        externalIntegration)

    return userProfile.id
  }
}
