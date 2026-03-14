import { UserPreferenceModel } from '../../../models/users/user-preference-model'

// Services
const userPreferenceModel = new UserPreferenceModel()

// Factory of resolvers
// Note: prisma must be passed into the GraphQL server's context
export function sereneCoreUserPreferencesMutationResolvers() {
  return {
    Mutation: {
      upsertUserPreference: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        try {
          return await
            userPreferenceModel.upsert(
              context.prisma,
              undefined,  // id
              args.userProfileId,
              args.category,
              args.key,
              args.value,
              args.values)
        } catch (error) {
          console.error(`upsertUserPreference: ${error}`)
        }
      },
    },
  }
}
