import React from 'react'
import { Link, Typography } from '@mui/material'

interface Props {
  label: string
  href: string
  value: string
  style?: any
}

export default function ViewLinkField({
                          label,
                          href,
                          value,
                          style = {}
                        }: Props) {

  // Render
  return (
    <div style={style}>
      <Typography
        variant='caption'>
        {label}
      </Typography>
      <Typography variant='body1'>
        <Link href={href}>
          {value}
        </Link>
      </Typography>
    </div>
  )
}
