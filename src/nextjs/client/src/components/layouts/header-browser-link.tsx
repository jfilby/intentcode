import { Link } from '@mui/material'

interface Props {
  name: string | undefined
  linkName: string
  highLevelLink: string
}

export function HeaderBrowserLink({
                  name,
                  linkName,
                  highLevelLink
                }: Props) {

  return (
    <>
      {highLevelLink === linkName ?
        <Link href={`/${linkName}`} style={{ color: 'black', fontWeight: '600' }} underline='hover'>
          {name}
        </Link>
      :
        <Link href={`/${linkName}`} style={{ color: 'black' }} underline='hover'>
          {name}
        </Link>
      }
    </>
  )
}
