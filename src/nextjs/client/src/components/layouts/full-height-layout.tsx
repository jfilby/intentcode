import { useMediaQuery } from '@mui/material'
import PageHeader from './header'
import Footer from './footer'
import LayoutBox from './layout-box'

interface Props {
  children: React.ReactNode
  projectName?: string | null
  ownerName?: string | null
  withHeader?: boolean
  userProfile: any | undefined
}

export const pageBodyWidthPlusPlus = '80em'
export const pageBodyWidthPlus = '60em'
export const pageBodyWidth = '54em'
export const columnBodyWidth = '40em'

export default function FullHeightLayout({
                          children,
                          projectName = null,
                          ownerName = null,
                          withHeader = true,
                          userProfile
                        }: Props) {

  // Consts
  const isMobile = useMediaQuery('(max-width:768px)')

  // Render
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '100%' }}>

        {withHeader === true ?
          <PageHeader
            userProfile={userProfile}
            isMobile={isMobile} />
        :
          <></>
        }

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

        <div style={{ marginTop: '1em' }}>
          <div style={{ display: 'inline-block' }}>
            <main>
              <LayoutBox isMobile={isMobile}>
                {children}
              </LayoutBox>
            </main>
          </div>
        </div>
      
        <Footer />
      </div>
    </div>
  )
}
