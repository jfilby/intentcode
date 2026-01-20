import { pageBodyWidthPlus } from './full-height-layout'
import { Box } from '@mui/material'

interface Props {
  children: React.ReactNode
  isMobile: boolean
  width?: string | null
}

export default function LayoutBox({
                          children,
                          isMobile,
                          width
                        }: Props) {

  // Vars
  var finalWidth = isMobile ? undefined : pageBodyWidthPlus

  if (width != null) {
    finalWidth = width
  }

  // Render
  return (
    <Box
      style={{
        // Mobile: slight left/right margin, desktop: no margin
        margin: isMobile ? '0 0.25em 0 0.25em' : '0 auto',
        textAlign: 'center',
        verticalAlign: 'textTop',
        width: finalWidth
      }}
      sx={{ bgcolor: 'background.default' }}>

      {children}
    </Box>
  )
}
