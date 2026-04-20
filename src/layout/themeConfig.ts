export const themeConfig = {
  palette: {
    primary: {
      main:  '#C9A84C',
      light: '#E8D5A0',
      dark:  '#8B6914',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main:  '#3A3120',
      light: '#5A4E35',
      dark:  '#1C1A14',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAF8F3',
      paper:   '#FFFFFF',
    },
    success: {
      main:  '#16A34A',
      light: '#4ADE80',
      dark:  '#15803D',
    },
    error: {
      main:  '#DC2626',
      light: '#F87171',
      dark:  '#B91C1C',
    },
    warning: {
      main:  '#D97706',
      light: '#FCD34D',
      dark:  '#B45309',
    },
    info: {
      main:  '#2563EB',
      light: '#60A5FA',
      dark:  '#1D4ED8',
    },
    text: {
      primary:   '#1C1A14',
      secondary: '#6B6456',
      disabled:  '#9D9082',
    },
    divider: '#EDE9E0',
  },
  typography: {
    fontFamily: '"Sarabun", "Roboto", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 700, fontSize: '2rem' },
    h3: { fontWeight: 700, fontSize: '1.75rem' },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '1rem',    lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#FAF8F3' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1C1A14',
          boxShadow: '0 1px 0 rgba(201,168,76,0.2)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #EDE9E0',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none' as const,
          fontWeight: 600,
          padding: '8px 20px',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(201,168,76,0.25)',
          '&:hover': { boxShadow: '0 4px 16px rgba(201,168,76,0.35)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #EDE9E0',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
        elevation1: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
        elevation2: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#EDE9E0' },
      },
    },
  },
};
