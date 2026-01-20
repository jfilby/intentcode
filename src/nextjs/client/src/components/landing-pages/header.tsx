import { Typography } from '@mui/material'

interface Props {
}

export default function LaunchedHeader({}: Props) {

  // Render
  return (
    <>
      <Typography
        variant='h1'>
        {process.env.NEXT_PUBLIC_APP_NAME}
      </Typography>

      <Typography variant='h6' style={{ marginTop: '-1em', marginBottom: '2em' }}>
        {process.env.NEXT_PUBLIC_TAG_LINE}
      </Typography>
    </>
  )
}
