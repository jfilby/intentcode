import { Typography } from '@mui/material'
import Layout from '@/components/layouts/layout'

export default function VerifyRequest() {

  // Consts
  const url = '/account/auth/verify-request'

  // Render
  return (
    <Layout userProfile={undefined}>

      <br/><br/>

      <div style={{ width: '100%' }}>
        <center>
          <div style={{width: '50%' }}>
            <Typography variant='body1'>
              Please check your email. There should be an email from &nbsp;
              {process.env.NEXT_PUBLIC_APP_NAME}&nbsp;
              with a link you can click to continued as a signed-in user.
            </Typography>
          </div>
        </center>
      </div>
    </Layout>
  )
}
