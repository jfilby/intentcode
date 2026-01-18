import { prisma } from '@/db'
import { CustomError } from '../../../types/errors'
import { ResourceQuotasQueryService } from '../../../services/quotas/query-service'
import { UsersService } from '../../../services/users/service'

// Services
const resourceQuotasService = new ResourceQuotasQueryService()
const usersService = new UsersService()

// Code
export async function getResourceQuotaUsage(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // Debug
  const fnName = 'getResourceQuotaUsage()'

  console.log(`${fnName}: args: ` + JSON.stringify(args))

  // Get userProfile
  const userProfile = await
          usersService.getById(
            prisma,
            args.userProfileId)

  // Validate
  if (userProfile == null) {
    throw new CustomError(`${fnName}: userProfile == null`)
  }

  // The user must be an admin
  if (userProfile.isAdmin === false) {

    return {
      status: false,
      message: `You aren't an admin user.`
    }
  }

  // Day (default to today)
  var day: Date

  if (args.day != null) {
    day = new Date(args.day)
  } else {
    day = new Date()
  }

  // Get quota and usage
  const results = await
          resourceQuotasService.getQuotaAndUsage(
            prisma,
            args.userProfileId,
            args.resource,
            day,
            false)  // inCents

  // Return
  return {
    userProfileId: args.userProfileId,
    resource: args.resource,
    day: day.toISOString(),
    quota: results.quota,
    usage: results.usage
  }
}
