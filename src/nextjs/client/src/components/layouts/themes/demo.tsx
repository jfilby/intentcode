import { createTheme } from '@mui/material'

export const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  // colorSchemes: { light: true, dark: true },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (themeParam) => ({
        html: {
          backgroundColor: themeParam.palette.background.default
        },
      }),
    }
  }
})
