export const themeConfig = {
  palette: {
    primary: {
      main:  '#C9A84C',
      light: '#E8D5A0',
      dark:  '#8B6914',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main:  '#23487a',
      light: '#3a6dad',
      dark:  '#1a324f',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#f6efe1',
      paper:   '#fbf6ea',
    },
    success: {
      main:  '#4b6b3a',
      light: '#7bc69a',
      dark:  '#2f4524',
    },
    error: {
      main:  '#a03025',
      light: '#e26a6a',
      dark:  '#6e1f18',
    },
    warning: {
      main:  '#9d7a1a',
      light: '#e3b74a',
      dark:  '#6b5210',
    },
    info: {
      main:  '#23487a',
      light: '#7aa7dc',
      dark:  '#1a324f',
    },
    text: {
      primary:   '#1b1713',
      secondary: '#756a59',
      disabled:  '#a79b83',
    },
    divider: '#e4d8bd',
  },
  typography: {
    fontFamily: '"IBM Plex Sans Thai", "Inter", system-ui, sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 700, fontSize: '2rem' },
    h3: { fontWeight: 700, fontSize: '1.75rem' },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '1rem',     lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#f6efe1' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#fbf6ea',
          color: '#1b1713',
          boxShadow: '0 1px 0 #e4d8bd',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#fbf6ea',
          borderRight: '1px solid #e4d8bd',
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
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid #e4d8bd',
          boxShadow: '0 1px 0 rgba(27,23,19,.04), 0 8px 24px -14px rgba(27,23,19,.18)',
          backgroundColor: '#fbf6ea',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 14 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#e4d8bd' },
      },
    },
  },
};
