import { MailingListSubscriberService } from '../../../services/mailing-lists/mailing-list-subscriber-service'

// Services
const mailingListSubscriberService = new MailingListSubscriberService()

// Factory of resolvers
// Note: prisma must be passed into the GraphQL server's context
export function sereneCoreMailingListsMutationResolvers() {
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
            mailingListSubscriberService.subscribe(
              context.prisma,
              args.mailingListName,
              args.email,
              args.firstName)
        } catch (error) {
          console.error(`upsertUserPreference: ${error}`)
        }
      },
    },
  }
}
