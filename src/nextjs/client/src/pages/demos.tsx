import Head from 'next/head'
import { Typography } from '@mui/material'
import { loadServerPage } from '@/services/page/load-server-page'
import Layout, { pageBodyWidth } from '@/components/layouts/layout'
import VideoPlayer from '@/components/video/youtube-player'

interface Props {
  userProfile: any
}

export default function DemosPage({ userProfile }: Props) {

  // Render
  return (
    <>
      <Head><title>{process.env.NEXT_PUBLIC_APP_NAME} - Demos</title></Head>

      <Layout userProfile={userProfile}>
        <div style={{ margin: '0 auto', width: pageBodyWidth, textAlign: 'left', verticalAlign: 'textTop' }}>

          <div>
            <Typography
              style={{ marginBottom: '0.5em' }}
              variant='h3'>
              Demos
            </Typography>

            <Typography
              style={{ marginBottom: '0.5em' }}
              variant='h4'>
              Gemini 3 hackathon demo video
            </Typography>

            <VideoPlayer videoId='1DocDRPuQHs' />

            <div style={{ marginBottom: '2em' }} />

            <Typography
              style={{ marginBottom: '0.5em' }}
              variant='body1'>
              An overview of IntentCode with a walkthrough of the Calc and
              Calc-v2 examples.
              <br/>
              Also includes a brief look at an extension with a skills file.
            </Typography>

            <div>
              <></>
            </div>
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
