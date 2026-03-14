import { ProfileService } from '../../../services/users/profile-service'

// Services
const profileService = new ProfileService()

// Factory of resolvers
// Note: prisma must be passed into the GraphQL server's context
export function sereneCoreProfileQueryResolvers() {
  return {
    Query: {
      validateProfileCompleted: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        return profileService.validateProfileCompleted(
          context.prisma,
          args.forAction,
          args.userProfileId)
      },
    },
  }
}
