import { useEffect, useState } from 'react'
import Grid from '@mui/material/Grid'
import { HeaderBrowser } from './header-browser'
import { HeaderMobile } from './header-mobile'
// import SystemAlert from '../alerts/system-alert'

// The approach used in this component shows how to build a sign in and sign out
// component that works on pages which support both client and server side
// rendering, and avoids any flash incorrect content on initial page load.
interface Props {
  userProfile: any | undefined
  isMobile: boolean
}

export default function PageHeader({
                          userProfile,
                          isMobile
                        }: Props) {
  /* const { data: session, status } = useSession()
  const loading = status === "loading" */

  // Consts
  const index = 'index'

  // State
  const [highLevelLink, setHighLevelLink] = useState<string|undefined>(undefined)

  // Functions
  function setMenuLink() {

    const paths = window.location.pathname.split('/')

    // console.log(paths)

    if (paths.length >= 2) {
      setHighLevelLink(paths[1])
    } else {
      setHighLevelLink(index)
    }
  }

  useEffect(() => {

    // Set current menu link
    setMenuLink()
  }, [])

  return (
    <>
      <Grid container style={{ background: '#f6f6f6', borderBottom: '1px solid #aaa', paddingLeft: '1em', paddingRight: '1em' }}>
        <header style={{ textAlign: 'center', width: '100%' }}>
          {/* <noscript>
            <style>{`.nojs-show { opacity: 1; top: 0; }`}</style>
          </noscript> */}

        {highLevelLink != null ?
          <>
          {isMobile === false ?
            <HeaderBrowser highLevelLink={highLevelLink} />
          :
            <HeaderMobile highLevelLink={highLevelLink} />
          }
          </>
        :
          <></>
        }

        </header>
      </Grid>
      {/* <SystemAlert userProfileId={userProfileId} /> */}
    </>
  )
}
