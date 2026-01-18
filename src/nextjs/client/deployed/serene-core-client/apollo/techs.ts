import { gql } from '@apollo/client'

export const getTechsQuery = gql`
  query getTechs(
          $userProfileId: String!,
          $resource: String!) {
    getTechs(
      userProfileId: $userProfileId,
      resource: $resource) {

      id
      resource
      variantName
    }
  }
`
