import React, { useState } from 'react'
import { Alert, Button, Link, TextField, Typography } from '@mui/material'
import { useMutation } from '@apollo/client/react'
import { signUpForWaitlistMutation } from '@/apollo/sign-ups'

interface Props {
}

export default function LaunchedDetails({}: Props) {

  // State
  const [email, setEmail] = useState('')
  const [alertSeverity, setAlertSeverity] = useState<any>(undefined)
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [submitDisabled, setSubmitDisabled] = useState(false)

  // GraphQL
  const [fetchSignUpForWaitlistMutation] =
    useMutation(signUpForWaitlistMutation, {
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

  async function waitlistSignup() {

    // Verify email address
    if (isEmail(email) === false) {
      setAlertSeverity('error')
      setMessage('The email address you entered is in valid')
      return
    } else {
      setAlertSeverity(undefined)
      setMessage(undefined)
    }

    // Disable the submit button
    setSubmitDisabled(true)

    // Call the GraphQL mutation
    var signUpForWaitlistData: any

    await fetchSignUpForWaitlistMutation({
      variables: {
        email: email
      }
    }).then((result: any) => signUpForWaitlistData = result)

    // Process the results
    const results = signUpForWaitlistData.data.signUpForWaitlist

    if (results.status === true) {

      // Success
      setAlertSeverity('success')
      setMessage(`You've subscribed to updates!`)
    } else {
      // Error
      setAlertSeverity('error')
      setMessage(results.message)
    }
  }

  // Render
  return (
    <>
      {/* <Typography
        style={{ display: 'inline' }}
        variant='body1'>
        Join the&nbsp;
      </Typography>
      <Link
        href='https://discord.gg/Pcd4HfaWW2'
        style={{ display: 'inline' }}>
        Discord server
      </Link>
      <Typography
        style={{ display: 'inline' }}
        variant='body1'>
        &nbsp;to connect with the community.
      </Typography>
      <br/>

      <Typography
        style={{ display: 'inline' }}
        variant='body1'>
        Read the&nbsp;
      </Typography>
      <Link
        href={process.env.NEXT_PUBLIC_DOCS_URL}
        style={{ display: 'inline' }}>
        documentation
      </Link>
      <Typography
        style={{ display: 'inline' }}
        variant='body1'>
        &nbsp;to learn more about the platform.
      </Typography>

      <div style={{ marginBottom: '5em' }} /> */}

      {/* <h1>AI Compiler</h1>

      <Typography
        style={{ marginBottom: '1em' }}
        variant='body1'>
        A new way to write software with natural language
      </Typography>

      <Typography
        style={{ marginBottom: '1em' }}
        variant='body1'>
        Get AI generated audio and video reports.
      </Typography>

      <div style={{ marginBottom: '5em' }} /> */}

      <Typography
        style={{ marginBottom: '0.5em' }}
        variant='h3'>
        Powered by
      </Typography>

      <Link href='https://ai.google.dev/gemini-api/docs'>
        <Typography
          style={{ marginBottom: '1em' }}
          variant='h6'>
          Google Gemini 3 API.
        </Typography>
      </Link>

      <div style={{ marginBottom: '5em' }} />

      <Typography
        style={{ marginBottom: '0.5em' }}
        variant='h3'>
        Get updates
      </Typography>

      <div style={{ marginBottom: 'em' }}>
        <form onSubmit={waitlistSignup}>
          <TextField
            id='email'
            placeholder='Email address'
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: '1em', width: '25em' }}
            value={email}
            variant='outlined' />
          <br/><br/>

          <Button
            disabled={submitDisabled}
            onClick={(e: any) => waitlistSignup()}
            style={{ marginBottom: '2em' }}
            type='submit'
            variant='contained'>
            Sign-up
          </Button>
        </form>

        {alertSeverity && message ?
          <Alert
            severity={alertSeverity}>
            {message}
          </Alert>
          :
          <></>
        }
      </div>
    </>
  )
}
