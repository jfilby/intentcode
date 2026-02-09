import Head from 'next/head'
import { Link, Typography } from '@mui/material'
import { loadServerPage } from '@/services/page/load-server-page'
import Layout, { pageBodyWidth } from '@/components/layouts/layout'

interface Props {
  userProfile: any
}

export default function DemosPage({ userProfile }: Props) {

  // Render
  return (
    <>
      <Head><title>{process.env.NEXT_PUBLIC_APP_NAME} - Get started</title></Head>

      <Layout userProfile={userProfile}>
        <div style={{ margin: '0 auto', width: pageBodyWidth, textAlign: 'left', verticalAlign: 'textTop' }}>

          <div>
            <Typography
              style={{ marginBottom: '0.5em' }}
              variant='h3'>
              Get started
            </Typography>

            <Typography
              style={{ marginBottom: '0.5em' }}
              variant='h4'>
              Repo
            </Typography>

            <Typography
              variant='body1'>
              IntentCode isn't yet available as an NPM and must be installed
              directly from the repo. You can get the latest here:
            </Typography>
            <br/>

            <Link
              href='https://github.com/jfilby/intentcode'>
              IntentCode (latest)
            </Link>
            <br/><br/>

            <Typography
              style={{ marginTop: '2em' }}
              variant='body1'>
              A snapshot ending Feb 9th for the Gemini 3 Hackathon is here:
            </Typography>
            <br/>

            <Link
              href='https://github.com/jfilby/intentcode_gemini3_hackathon/'>
              IntentCode (Gemini 3 Hackathon)
            </Link>
          </div>
        </div>
      </Layout>
    </>
  )
}

export async function getServerSideProps(context: any) {

  return loadServerPage(
           context,
           {})
}
