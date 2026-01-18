import { gql } from '@apollo/client'

export const getUserPreferencesQuery = gql`
  query getUserPreferences(
          $userProfileId: String!,
          $category: String!,
          $keys: [String]) {
    getUserPreferences(
      userProfileId: $userProfileId,
      category: $category,
      keys: $keys) {
      category
      key
      value
      values
    }
  }
`

export const upsertUserPreferenceMutation = gql`
  mutation upsertUserPreference(
             $userProfileId: String!,
             $category: String!,
             $key: String!,
             $value: String,
             $values: [String]) {
    upsertUserPreference(
      userProfileId: $userProfileId,
      category: $category,
      key: $key,
      value: $value,
      values: $values)
  }
`
