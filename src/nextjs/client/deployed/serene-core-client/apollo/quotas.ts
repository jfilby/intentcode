import { gql } from '@apollo/client'

export const getResourceQuotaUsageQuery = gql`
  query getResourceQuotaUsage(
          $userProfileId: String!,
          $resource: String!,
          $day: String,
          $viewUserProfileId: String) {
    getResourceQuotaUsage(
      userProfileId: $userProfileId,
      resource: $resource,
      day: $day,
      viewUserProfileId: $viewUserProfileId) {

      userProfileId
      resource
      day
      quota
      usage
    }
  }
`
