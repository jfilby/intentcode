import { createTheme } from '@mui/material';

export const blackAndWhiteTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000', // Black
      contrastText: '#FFFFFF', // White text
    },
    secondary: {
      main: '#666666', // Neutral gray as an accent
    },
    background: {
      default: '#FFFFFF', // White background
      paper: '#F5F5F5', // Light gray paper background
    },
    text: {
      primary: '#000000', // Black for main text
      secondary: '#4D4D4D', // Dark gray for secondary text
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
          color: '#000000', // Black links
          textDecoration: 'none',
          '&:visited': {
            color: '#000000', // Keep black on visited
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
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', // Subtle shadow
        },
      },
    },
  },
});
