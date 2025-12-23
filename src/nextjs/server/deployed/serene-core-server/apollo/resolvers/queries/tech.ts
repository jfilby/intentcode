import { prisma } from '@/db'
import { TechQueryService } from '../../../services/tech/tech-query-service'
import { UsersService } from '../../../services/users/service'

// Services
const techQueryService = new TechQueryService()
const usersService = new UsersService()

// Code
export async function getTechs(
                        parent: any,
                        args: any,
                        context: any,
                        info: any) {

  // Debug
  const fnName = 'getTechs()'

  console.log(`${fnName}: args: ` + JSON.stringify(args))

  // Get userProfile
  const userProfile = await
          usersService.getById(
            prisma,
            args.userProfileId)

  // Get quota and usage
  const results = await
          techQueryService.getTechs(
            prisma,
            userProfile,
            args.resource)

  // Return
  return results.techs
}
