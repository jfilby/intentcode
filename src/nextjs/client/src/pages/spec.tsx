import Head from 'next/head'
import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { Typography } from '@mui/material'
import { loadServerPage } from '@/services/page/load-server-page'
import Layout, { pageBodyWidth } from '@/components/layouts/layout'

interface Props {
  userProfile: any
}

export default function DemosPage({ userProfile }: Props) {

  const [spec, setSpec] = useState('')

  useEffect(() => {
    fetch('/docs/spec.md')
      .then(res => res.text())
      .then(setSpec)
  }, [])

  // Render
  return (
    <>
      <Head><title>{process.env.NEXT_PUBLIC_APP_NAME} - Spec</title></Head>

      <Layout userProfile={userProfile}>
        <div style={{ margin: '0 auto', width: pageBodyWidth, textAlign: 'left', verticalAlign: 'textTop' }}>

          <div>
            <Typography
              style={{ marginBottom: '0.5em' }}
              variant='h3'>
              Spec
            </Typography>

            <Markdown>
              {spec}
            </Markdown>

            <div style={{ marginBottom: '10em' }} />
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
