import { TechQueryService } from '../../../services/tech/tech-query-service'
import { UsersService } from '../../../services/users/service'

// Services
const techQueryService = new TechQueryService()
const usersService = new UsersService()

// Factory of resolvers
// Note: prisma must be passed into the GraphQL server's context
export function sereneCoreTechQueryResolvers() {
  return {
    Query: {
      getTechs: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        // Debug
        const fnName = 'getTechs()'

        console.log(`${fnName}: args: ` + JSON.stringify(args))

        // Get userProfile
        const userProfile = await
          usersService.getById(
            context.prisma,
            args.userProfileId)

        // Get quota and usage
        const results = await
          techQueryService.getTechs(
            context.prisma,
            userProfile,
            args.resource)

        // Return
        return results.techs
      },
    },
  }
}
