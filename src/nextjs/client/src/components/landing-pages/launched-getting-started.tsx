import React from 'react'
import { Button, Typography } from '@mui/material'

interface Props {
  authSession: any
}

// Put into its own component to make loading without flashing signed-out/
// signed-in details
export default function GettingStartedDetails({
                          authSession
                        }: Props) {

  // Render
  return (
    <>
      <div style={{ marginBottom: '2em' }}/>

      {authSession == null ?
        <Typography
          style={{ marginBottom: '0.5em' }}
          variant='h3'>
          Try it out
        </Typography>
      :
        <Typography
          style={{ marginBottom: '0.5em' }}
          variant='h3'>
          Welcome back
        </Typography>
      }

      <div style={{ marginBottom: '2em' }}>
        {authSession == null ?
          <>
            {/* <Button
              onClick={(e: any) => window.location.href = `account/auth/sign-up`}
              variant='outlined'>
              Sign-up
            </Button>
            <Button
              style={{ marginLeft: '1em' }}
              onClick={(e: any) => window.location.href = `account/auth/sign-in`}
              variant='outlined'>
              Sign-in
            </Button> */}
          </>
        :
          <></>
        }

        <Button
          style={{ marginLeft: '1em' }}
          onClick={(e: any) => window.location.href = `/get-started`}
          variant='contained'>
          Get started
        </Button>

        <Button
          style={{ marginLeft: '1em' }}
          onClick={(e: any) => window.location.href = `/demos`}
          variant='contained'>
          Demos
        </Button>

        {/* <Button
          style={{ marginLeft: '1em' }}
          onClick={(e: any) => window.location.href = `/account/subscription`}
          variant='contained'>
          Pricing
        </Button> */}
      </div>

      {authSession == null ?
        <Typography
          style={{ marginBottom: '1em' }}
          variant='h6'>
          Sign-up to save your work.
        </Typography>
      :
        <></>
      }

      <div style={{ marginBottom: '5em' }} />
    </>
  )
}
