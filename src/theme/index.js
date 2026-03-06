import { createTheme, alpha } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C3AED',
      light: '#9D5FFF',
      dark: '#5B21B6',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#06B6D4',
      light: '#38D4EF',
      dark: '#0891B2',
    },
    background: {
      default: '#0A0A0F',
      paper: '#111118',
    },
    surface: {
      main: '#16161F',
      hover: '#1E1E2A',
      border: '#2A2A38',
    },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    text: {
      primary: '#F0F0F8',
      secondary: '#9090A8',
      disabled: '#4A4A60',
    },
  },
  typography: {
    fontFamily: '"Geist", "Inter", system-ui, sans-serif',
    h1: { fontFamily: '"Cal Sans", "Geist", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Cal Sans", "Geist", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Cal Sans", "Geist", sans-serif', fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.6 },
    code: { fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
          transition: 'all 0.2s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 30px rgba(124, 58, 237, 0.5)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: alpha('#7C3AED', 0.05),
            '& fieldset': { borderColor: '#2A2A38' },
            '&:hover fieldset': { borderColor: '#7C3AED' },
            '&.Mui-focused fieldset': { borderColor: '#7C3AED', borderWidth: 2 },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111118',
          border: '1px solid #2A2A38',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D0D14',
          borderRight: '1px solid #1E1E2A',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1E1E2A',
          border: '1px solid #2A2A38',
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 4px',
          '&:hover': { backgroundColor: alpha('#7C3AED', 0.1) },
          '&.Mui-selected': { backgroundColor: alpha('#7C3AED', 0.15) },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: '#7C3AED' },
        thumb: {
          boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.2)',
          '&:hover': { boxShadow: '0 0 0 8px rgba(124, 58, 237, 0.2)' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 0.2s ease',
          '&:hover': { transform: 'scale(1.05)' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 6px',
          '&:hover': { backgroundColor: alpha('#7C3AED', 0.1) },
          '&.Mui-selected': {
            backgroundColor: alpha('#7C3AED', 0.15),
            borderLeft: '3px solid #7C3AED',
            '&:hover': { backgroundColor: alpha('#7C3AED', 0.2) },
          },
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7C3AED',
      light: '#9D5FFF',
      dark: '#5B21B6',
    },
    secondary: {
      main: '#06B6D4',
    },
    background: {
      default: '#F8F7FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#6B6B8A',
    },
  },
  typography: darkTheme.typography,
  shape: darkTheme.shape,
  components: {
    ...darkTheme.components,
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#F0EEFF',
          borderRight: '1px solid #E0D8FF',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #E8E4FF',
        },
      },
    },
  },
});
