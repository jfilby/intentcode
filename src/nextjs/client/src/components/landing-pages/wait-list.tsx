import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { signUpForWaitlistMutation } from '@/apollo/sign-ups'
import { Alert, Button, TextField, Typography } from '@mui/material'
import { loadServerPage } from '@/services/page/load-server-page'
import FullHeightLayout, { pageBodyWidth } from '@/components/layouts/full-height-layout'

interface Props {
  userProfile: any
}

export default function WaitListLandingPage({
                          userProfile
                        }: Props) {

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
      <FullHeightLayout
        userProfile={userProfile}
        withHeader={false}>

        <div style={{ margin: '0 auto', width: pageBodyWidth, verticalAlign: 'textTop' }}>
          <h1>IntentCode</h1>
          <Typography variant='body1' style={{ marginBottom: '2em' }}>
            {process.env.NEXT_PUBLIC_TAG_LINE}
          </Typography>

          <div style={{ marginBottom: '2em' }}>
            <h1>Join the waitlist</h1>

            <form onSubmit={waitlistSignup}>
              <TextField
                id='email'
                label='Email address'
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

          <div style={{ marginBottom: '5em' }} />

          <h1>February 2026: Gemini 3 hackathon deadline</h1>
          <ul>
            <li>
              <Typography variant='body1'>
                Try a new way to code with natural language.
              </Typography>
            </li>
          </ul>

        </div>
      </FullHeightLayout>
    </>
  )
}

export async function getServerSideProps(context: any) {

  return loadServerPage(
           context,
           {})
}
