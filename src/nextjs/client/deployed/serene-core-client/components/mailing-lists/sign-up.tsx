import React, { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { mailingListSignupMutation } from '../../apollo/mailing-lists'
import { Alert, Button, TextField } from '@mui/material'

interface Props {
  mailingListName: string
}

export default function MailingListSignUp({
                          mailingListName
                        }: Props) {

  // Types
  type AlertSeverity = 'error' | 'warning' | 'info' | 'success' | undefined

  // State
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>(undefined)
  const [message, setMessage] = useState<string | undefined>(undefined)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [submitDisabled, setSubmitDisabled] = useState(false)

  // GraphQL
  const [fetchMailingListSignupMutation] =
    useMutation<any>(mailingListSignupMutation, {
      fetchPolicy: 'no-cache'
      /* onCompleted: data => {
        console.log('elementName: ' + elementName)
        console.log(data)
      },
      onError: error => {
        console.log(error)
      } */
    })

  // Functions
  function isEmail(search: string): boolean {
    var serchFind: boolean

    const regexp = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)

    serchFind = regexp.test(search)

    console.log(serchFind)
    return serchFind
  }

  async function signUpForMailingList() {

    // Verify email address
    if (isEmail(email) === false) {
      setAlertSeverity('error')
      setMessage('The email address you entered is in valid')
    } else {
      setAlertSeverity(undefined)
      setMessage(undefined)
    }

    // Disable the submit button
    setSubmitDisabled(true)

    // Call the GraphQL mutation
    var mailingListSignupData: any

    await fetchMailingListSignupMutation({
      variables: {
        mailingListName: mailingListName,
        email: email,
        firstName: firstName
      }
    }).then(result => mailingListSignupData = result)

    // Process the results
    const results = mailingListSignupData.data.mailingListSignup

    if (results.status === true) {

      // Success
      setAlertSeverity('success')
      setMessage(`You've applied to enter in the private beta!`)
    } else {
      // Error
      setAlertSeverity('error')
      setMessage(results.message)
    }
  }

  // Render
  return (
    <>
      <TextField
        id='email'
        label='Email address'
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: '1em', width: '100%' }}
        value={email}
        variant='outlined' />

      <TextField
        label='First name'
        onChange={(e) => setFirstName(e.target.value)}
        style={{ marginBottom: '1em', width: '100%' }}
        value={firstName}
        variant='outlined' />

      <Button
        // disabled={submitDisabled}
        onClick={(e) => signUpForMailingList()}
        style={{ marginBottom: '2em' }}
        variant='contained'>
        Sign-up
      </Button>

      {alertSeverity && message ?
        <Alert
          severity={alertSeverity}>
          {message}
        </Alert>
      :
        <></>
      }
    </>
  )
}
