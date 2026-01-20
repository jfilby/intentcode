import Head from 'next/head'
import { loadServerPage } from '@/services/page/load-server-page'
import LaunchedLandingPage from '@/components/landing-pages/launched'
import WaitListLandingPage from '@/components/landing-pages/wait-list'

interface Props {
  userProfile: any
}

export default function LandingPage({
                          userProfile
                        }: Props) {

  // Render
  return (
    <>
      <Head>
        <title>{process.env.NEXT_PUBLIC_APP_NAME}</title>
      </Head>

      {process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true' ?
        <WaitListLandingPage
          userProfile={userProfile} />
      :
        <LaunchedLandingPage
          userProfile={userProfile} />
      }
    </>
  )
}

export async function getServerSideProps(context: any) {

  return loadServerPage(
           context,
           {})
}
