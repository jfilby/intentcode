import React from 'react'
import { Typography } from '@mui/material'

interface Props {
  label: string
  value: string
  style?: any
}

export default function ViewTextField({
                          label,
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
        {value}
      </Typography>
    </div>
  )
}
