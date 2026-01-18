import { gql } from '@apollo/client'

export const mailingListSignupMutation = gql`
  mutation mailingListSignup(
    $mailingListName: String!,
    $email: String!,
    $firstName: String)
  {
    mailingListSignup(
      mailingListName: $mailingListName,
      email: $email,
      firstName: $firstName) {

      verified
      message
    }
  }
`

export const verifySignupMutation = gql`
  mutation verifySignup(
             $mailingListName: String!,
             $email: String!,
             $verifyCode: String)
  {
    verifySignup(
      mailingListName: $mailingListName,
      email: $email,
      verifyCode: $verifyCode) {

      verified
      message
    }
  }
`
