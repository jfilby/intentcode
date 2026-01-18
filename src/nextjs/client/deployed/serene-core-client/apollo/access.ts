import { gql } from '@apollo/client'

export const isAdminUserQuery = gql`
  query isAdminUser($userProfileId: String!) {
    isAdminUser(userProfileId: $userProfileId) {
      status
      message
    }
  }
`
