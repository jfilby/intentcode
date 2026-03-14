import { AccessService } from '../../../services/access/access-service'

// Services
const accessService = new AccessService()

// Factory of resolvers
// Note: prisma must be passed into the GraphQL server's context
export function sereneCoreAccessQueryResolvers() {
  return {
    Query: {
      isAdminUser: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
    return accessService.isAdminUser(
      context.prisma,
      args.userProfileId)
      },
    },
  }
}
