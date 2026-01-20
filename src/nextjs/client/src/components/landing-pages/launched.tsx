import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Link, Typography } from '@mui/material'
import { loadServerPage } from '@/services/page/load-server-page'
import { pageBodyWidth } from '@/components/layouts/full-height-layout'
import MoreInformation from '@/components/layouts/more-information'
// import Bot1Svg from '../layouts/logos/bot-1'
import GettingStartedDetails from './launched-getting-started'
import LaunchedDetails from './launched-details'
import LaunchedHeader from './header'
import Layout from '../layouts/layout'
import styles from './hero.module.css'

interface Props {
  userProfile: any
}

export default function LaunchedLandingPage({
                          userProfile
                        }: Props) {

  // Session
  const { data: session } = useSession()

  // State
  const [authSession, setAuthSession] = useState<any>(undefined)

  // Effects
  useEffect(() => {

    if (session === undefined) {
      return
    } else if (session != null) {
      setAuthSession(session)
    } else {
      setAuthSession(null)
    }
  }, [session])

  // Render
  return (
    <>
      <Layout userProfile={userProfile}>

        <div
          className={styles.hero}
          style={{ margin: '0 auto', width: pageBodyWidth, textAlign: 'left', verticalAlign: 'textTop' }}>

          <LaunchedHeader />

          {process.env.NEXT_PUBLIC_PRODUCTION_HOST_NAME!.indexOf('.beta') >= 0 ?
            <div style={{ marginBottom: '2em' }}>
              <h1>Beta server</h1>

              <Typography
                style={{ display: 'inline' }}
                variant='body1'>
                You can use this server to test out features. Note
                that rate-limiting is in place and some features are disabled.

                For the full experience use the&nbsp;
                <Link href={process.env.NEXT_PUBLIC_PRODUCTION_HOST_NAME}>
                  production server
                </Link>, when it becomes available.
              </Typography>
            </div>
          :
            <></>
          }

          <GettingStartedDetails
            authSession={authSession} />

          <LaunchedDetails />
        </div>

        <MoreInformation />

      </Layout>
    </>
  )
}

export async function getServerSideProps(context: any) {

  return loadServerPage(
           context,
           {})
}
