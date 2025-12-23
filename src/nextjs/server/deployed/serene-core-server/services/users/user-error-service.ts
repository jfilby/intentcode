import { PrismaClient } from '@prisma/client'
import { UserErrorModel } from '../../models/users/user-error-model'
import { UserErrorSummaryModel } from '../../models/users/user-error-summary-model'

// Models
const userErrorModel = new UserErrorModel()
const userErrorSummaryModel = new UserErrorSummaryModel()

// Class
export class UserErrorService {

  async upsert(
          prisma: PrismaClient,
          userProfileId: string,
          endUserProfileId: string | null,
          instanceId: string | null,
          summaryMessage: string | undefined,
          origin: string,
          message: string,
          techMessage: string | null) {

    // If the summaryMessage isn't specified, set it to the message
    if (summaryMessage == null) {
      summaryMessage = message
    }

    // Get the existing UserErrorSummary if it exists
    var userErrorSummary = await
          userErrorSummaryModel.getByUniqueKey(
            prisma,
            userProfileId,
            instanceId,
            origin,
            summaryMessage)

    // Create/update UserErrorSummary
    if (userErrorSummary == null) {

      // Create
      userErrorSummary = await
        userErrorSummaryModel.create(
          prisma,
          userProfileId,
          instanceId,
          origin,
          summaryMessage,
          1)  // count
    } else {

      // Inc count
      userErrorSummary = await
        userErrorSummaryModel.update(
          prisma,
          userErrorSummary.id,
          undefined,
          undefined,
          undefined,
          undefined,
          userErrorSummary.count + 1)
    }

    // Create UserError
    const userError = await
            userErrorModel.create(
              prisma,
              userErrorSummary.id,
              userProfileId,
              endUserProfileId,
              instanceId,
              origin,
              message,
              techMessage)
  }
}
