import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import { signIn, signOut, useSession } from 'next-auth/react'
import { AppBar, Button, Divider, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { HeaderMobileLink } from './header-mobile-link'

interface Props {
  highLevelLink: string
}

export function HeaderMobile({ highLevelLink }: Props) {

  const { data: session } = useSession()

  const handleSignin = (e: any) => {
    e.preventDefault()
    signIn()
  }

  const handleSignout = (e: any) => {
    e.preventDefault()
    signOut()
  }

  const [active, setActive] = useState('')

  /* const useStyles = makeStyles((theme) => ({
    menuButton: {
      marginRight: theme.spacing(2),
    },
    appBar: {
      zIndex: theme.zIndex.drawer + 1,
    },
  })) */
  
  // const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState(null)
  
  const handleMenuOpen = (e: any) => {
    setAnchorEl(e.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  useEffect(() => {
    setActive(window.location.pathname)
  }, [])

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position='fixed'>
        <Toolbar>
          <IconButton
            edge='start'
            color='inherit'
            aria-label='menu'
            onClick={handleMenuOpen}
            style={{ marginRight: '2px' }}>
            <MenuIcon />
          </IconButton>
          <Menu
            id='menu-appbar'
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}>
            <HeaderMobileLink
                name='Home'
                linkName=''
                highLevelLink={highLevelLink} />
            <HeaderMobileLink
                name='Get started'
                linkName='get-started'
                highLevelLink={highLevelLink} />
            <HeaderMobileLink
                name='Spec'
                linkName='spec'
                highLevelLink={highLevelLink} />
            <HeaderMobileLink
              name='Demos'
              linkName='demos'
              highLevelLink={highLevelLink} />
            <Divider />
            {/* <HeaderMobileLink
              name='Docs'
              linkName='docs'
              highLevelLink={highLevelLink} /> */}
            <HeaderMobileLink
              name='About'
              linkName='about'
              highLevelLink={highLevelLink} />
            {/* <HeaderMobileLink
              name='Account'
              linkName='account'
              highLevelLink={highLevelLink} /> */}
            {/* Add more menu items as needed */}
          </Menu>

          <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
            {process.env.NEXT_PUBLIC_APP_NAME}
          </Typography>

          {session == null ?
            <Button
              color='inherit'
              onClick={(e) => handleSignin(e)}>
                Sign in
            </Button>
          :
            <Button
              color='inherit'
              onClick={(e) => handleSignout(e)}>
                Sign out
            </Button>
          }

        </Toolbar>
      </AppBar>
      <br/><br/>
    </Box>
  )
}
