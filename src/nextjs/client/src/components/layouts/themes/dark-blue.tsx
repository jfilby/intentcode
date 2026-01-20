import { createTheme } from '@mui/material'

export const darkBlueTheme = createTheme({
      palette: {
        mode: 'light',
        primary: {
          main: '#1E3A8A', // Dark Blue
          contrastText: '#FFFFFF', // White text for contrast
        },
        secondary: {
          main: '#F59E0B', // Amber-500 (a warm accent to balance dark blue)
        },
        background: {
          default: '#F9FAFB', // Light gray background for a neutral base
          paper: '#FFFFFF',
        },
        text: {
          primary: '#1F2937', // Dark Gray for readability
          secondary: '#6B7280', // Medium Gray
        },
      },
      typography: {
        fontFamily: 'Inter, Roboto, sans-serif',
        button: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
      shape: {
        borderRadius: 10,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            a: {
              color: '#1E3A8A', // Links with dark blue color
              textDecoration: 'none',
              '&:visited': {
                color: '#1E3A8A', // Maintain dark blue on visited links
              },
              '&:hover': {
                textDecoration: 'underline',
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            },
          },
        },
      },
    });
