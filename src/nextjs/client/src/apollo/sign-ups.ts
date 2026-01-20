import { gql } from '@apollo/client'

export const signUpForWaitlistMutation = gql`
  mutation signUpForWaitlist($email: String!)
  {
    signUpForWaitlist(email: $email) {
      status
      message
    }
  }
`
