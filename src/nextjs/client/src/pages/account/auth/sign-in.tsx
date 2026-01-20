import { useEffect, useState } from 'react'
import { Button, FormControl, TextField, Typography } from '@mui/material'
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next'
import { getCsrfToken, signIn } from 'next-auth/react'
import Layout from '@/components/layouts/layout'

export default function SignIn({ csrfToken }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  // Consts
  const url = '/account/auth/sign-in'

  // State
  const [email, setEmail] = useState('')

  // Events
  useEffect(() => {

    // Return early if newDirName isn't set
    // setImageBasePath(window.location.protocol + '//' + window.location.host + '/img/')
  }, [])

  // Render
  return (
    <Layout userProfile={undefined}>

      <br/><br/>

      <div style={{ width: '100%', marginBottom: '2em' }}>
        <center>
          <div style={{ width: '50%' }}>
            <Typography
              style={{ marginBottom: '1m' }}
              variant='h5'>
              Sign-in
            </Typography>
          </div>
        </center>
      </div>

      <div style={{ marginBottom: '2em', textAlign: 'center' }}>

        <div style={{ marginBottom: '2em' }}>
          <Button
            onClick={() => signIn('google')}
            style={{ marginBottom: '1em' }}
            variant='contained'>
            Sign in with Google
          </Button>
          <br/><br/>

          <Typography
            variant='body1'>
            .. or you can test this project as a signed-out user. You can still
            personalize your experience until you clear cookies for this site.
          </Typography>
        </div>

        {/* <form method='post' action='/api/auth/signin/email'>
          <input name='csrfToken' type='hidden' defaultValue={csrfToken} />

          <FormControl style={{ marginBottom: '2em', width: '20em' }}>
            <TextField
              id='email'
              label='Email'
              name='email'
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              variant='outlined' />
          </FormControl>
          <br/>

          <Button
            type='submit'
            variant='contained'>
            Sign in with Email
           </Button>
        </form> */}
      </div>

      {/* <div style={{ width: '100%', marginBottom: '5em' }}>
        <center>
          <div style={{ width: '50%' }}>
            <Typography variant='body1'>
              Please enter the email address for your account, then click `Sign in with email`
              or press enter.
            </Typography>
          </div>
        </center>
      </div> */}

      {/* <div style={{ width: '100%' }}>
        <center>
          <div style={{ width: '50%' }}>
            <Typography
              style={{ marginBottom: '1m' }}
              variant='h5'>
              Trouble signing in?
            </Typography>

            <Typography variant='body1'>
              You need to use the same sign-in method that you originally used to
              sign-up with.
            </Typography>
          </div>
        </center>
      </div> */}

    </Layout>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const csrfToken = await getCsrfToken(context)
  return {
    props: { csrfToken },
  }
}
