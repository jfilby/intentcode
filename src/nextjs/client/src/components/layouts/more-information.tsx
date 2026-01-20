import { Link, Typography } from '@mui/material'

export default function MoreInformation() {

  return (
    <div style={{ marginTop: '5em', textAlign: 'center' }}>
      <Typography
        variant='h5'
        style={{ marginBottom: '1em' }}>
        More Information
      </Typography>
      <Typography>
        <Link href='/about' underline='hover'>About {process.env.NEXT_PUBLIC_APP_NAME}</Link>
      </Typography>
    </div>
  )
}
