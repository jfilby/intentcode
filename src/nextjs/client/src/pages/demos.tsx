import Head from 'next/head'
import { Typography } from '@mui/material'
import { loadServerPage } from '@/services/page/load-server-page'
import Layout, { pageBodyWidth } from '@/components/layouts/layout'

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
              variant='h4'>
              Demo video
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
