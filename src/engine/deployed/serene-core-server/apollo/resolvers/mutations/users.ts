import { UsersService } from '../../../services/users/service'

// Services
const usersService = new UsersService()

// Factory of resolvers
// Note: prisma must be passed into the GraphQL server's context
export function sereneCoreUsersMutationResolvers() {
  return {
    Mutation: {
      createBlankUser: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        return usersService.createBlankUser(context.prisma)
      },
      createUserByEmail: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        return usersService.createUserByEmail(
          context.prisma,
          args.email)
      },
      getOrCreateSignedOutUser: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        try {
          return usersService.getOrCreateSignedOutUser(
            context.prisma,
            args.signedOutId,
            args.defaultUserPreferences)
        } catch (error) {
          console.error(`getOrCreateSignedOutUser(): error: ${error}`)
        }
      },
      getOrCreateUserByEmail: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        try {
          return usersService.getOrCreateUserByEmail(
            context.prisma,
            args.email,
            args.defaultUserPreferences)
        } catch (error) {
          console.error(`getOrCreateUserByEmail(): error: ${error}`)
        }
      },
    },
  }
}
