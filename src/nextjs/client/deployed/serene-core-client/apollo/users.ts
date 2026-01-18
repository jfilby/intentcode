import { gql } from '@apollo/client'

export const createBlankUserMutation = gql`
  mutation createBlankUser {
    createBlankUser {

      id
      userId
      isAdmin
    }
  }
`

export const createUserByEmailMutation = gql`
  mutation createUserByEmail($email: String!) {
    createUserByEmail(email: $email)
  }
`

export const getOrCreateSignedOutUserMutation = gql`
  mutation getOrCreateSignedOutUser(
             $signedOutId: String,
             $defaultUserPreferences: String) {
    getOrCreateSignedOutUser(
      signedOutId: $signedOutId,
      defaultUserPreferences: $defaultUserPreferences) {

    id
    userId
    isAdmin
  }
}
`

export const getOrCreateUserByEmailMutation = gql`
  mutation getOrCreateUserByEmail(
             $email: String!,
             $defaultUserPreferences: String) {
    getOrCreateUserByEmail(
      email: $email,
      defaultUserPreferences: $defaultUserPreferences) {

      id
      userId
      isAdmin
    }
  }
`

export const updateIFileCreatedByMutation = gql`
  mutation updateIFileCreatedBy(
             $id: String!,
             $userId: String!,
             $signedOutUserId: String!) {
    updateIFileCreatedBy(
      id: $id,
      userId: $userId,
      signedOutUserId: $signedOutUserId)
  }
`

export const verifySignedInUserProfileIdQuery = gql`
  query verifySignedInUserProfileId($userProfileId: String!) {
    verifySignedInUserProfileId(userProfileId: $userProfileId)
  }
`
