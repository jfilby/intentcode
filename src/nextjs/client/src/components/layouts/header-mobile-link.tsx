import { MenuItem } from '@mui/material'

interface Props {
  name: string | undefined
  linkName: string
  highLevelLink: string
}

export function HeaderMobileLink({
                  name,
                  linkName,
                  highLevelLink
                }: Props) {

  return (
    <>
      {highLevelLink === linkName ?
        <MenuItem onClick={(e: any) => location.href=`/${linkName}`} style={{ fontWeight: '600' }}>{name}</MenuItem>
      :
        <MenuItem onClick={(e: any) => location.href=`/${linkName}`}>{name}</MenuItem>
      }
    </>
  )
}
