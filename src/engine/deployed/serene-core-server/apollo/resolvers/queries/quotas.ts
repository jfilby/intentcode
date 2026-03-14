import { ResourceQuotasQueryService } from '../../../services/quotas/query-service'

// Services
const resourceQuotasService = new ResourceQuotasQueryService()

// Factory of resolvers
// Note: prisma must be passed into the GraphQL server's context
export function sereneCoreQuotasQueryResolvers() {
  return {
    Query: {
      getResourceQuotaUsage: async (
        parent: any,
        args: any,
        context: any,
        info: any
      ) => {
        return resourceQuotasService.getQuotaAndUsageForUi(
          context.prisma,
          args.userProfileId,
          args.resource,
          args.day)
      },
    },
  }
}
