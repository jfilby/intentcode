import { gql } from '@apollo/client'

export const getTipsByUserProfileIdAndTagsQuery = gql`
  query getTipsByUserProfileIdAndTags(
          $userProfileId: String!,
          $tags: [String]) {
    getTipsByUserProfileIdAndTags(
      userProfileId: $userProfileId,
      tags: $tags) {

      status
      message
      tips {
        id
        name
      }
    }
  }
`

export const tipGotItExistsQuery = gql`
  query tipGotItExists(
          $name: String!,
          $userProfileId: String!) {
    tipGotItExists(
      name: $name,
      userProfileId: $userProfileId) {

      status
      message
      exists
    }
  }
`

export const upsertTipGotItMutation = gql`
  mutation upsertTipGotIt(
             $name: String!,
             $userProfileId: String!) {
    upsertTipGotIt(
      name: $name,
      userProfileId: $userProfileId) {

      status
      message
    }
  }
`
