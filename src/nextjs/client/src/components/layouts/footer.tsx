import { Link, Typography } from '@mui/material'

export default function Footer() {
  return (
    <div style={{ marginTop: '5em', padding: '1em' }}>
      <Typography variant='body1'>
        Created by Jason Filby (X:&nbsp;
        <Link href='https://x.com/jasonfi'>@jasonfi</Link>).
      </Typography>
    </div>
  )
}
