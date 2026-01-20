import { useMediaQuery } from '@mui/material'
import PageHeader from './header'
import Footer from './footer'
import LayoutBox from './layout-box'

interface Props {
  children: React.ReactNode
  projectName?: string | null
  ownerName?: string | null
  userProfile: any | undefined
  width?: string | null
}

export const pageBodyWidth = '54em'
export const columnBodyWidth = '40em'

export default function Layout({
                          children,
                          projectName = null,
                          ownerName = null,
                          userProfile,
                          width = null
                        }: Props) {

  // Consts
  const isMobile = useMediaQuery('(max-width:768px)')

  // Render
  return (
    <>
      <PageHeader
        userProfile={userProfile}
        isMobile={isMobile} />

      {projectName != null ?
        <div style={{ textAlign: 'center' }}>
          <h3>
            {projectName}
            {ownerName != null ?
              <>
                &nbsp;
                <span style={{ fontWeight: '400' }}>(owner: {ownerName})</span>
              </>
            :
              <></>
            }
          </h3>
        </div>
      :
        <></>
      }

      <div style={{ marginBottom: '2.5em' }} />
        <main>
          <LayoutBox
            isMobile={isMobile}
            width={width}>
            {children}
          </LayoutBox>
        </main>
      <Footer />
    </>
  )
}
