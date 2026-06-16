import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#faf7f2',
      paper: '#ede8de',
    },
    primary: {
      main: '#d97706',
      light: '#f59e0b',
      dark: '#b45309',
    },
    text: {
      primary: '#1c1917',
      secondary: '#78716c',
    },
    divider: '#d6cfc4',
    error: {
      main: '#dc2626',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        },
      }),
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1c1917',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
        }),
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.default,
          borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
          '&:hover': { backgroundColor: theme.palette.background.default },
          '&.Mui-focused': { backgroundColor: theme.palette.background.default },
          '&:before': { borderColor: theme.palette.divider },
          '&:hover:not(.Mui-disabled):before': { borderColor: theme.palette.primary.main },
          '&:after': { borderColor: theme.palette.primary.main },
        }),
        input: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary,
          '&.Mui-focused': { color: theme.palette.primary.dark },
        }),
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          borderRadius: theme.shape.borderRadius,
          fontWeight: 600,
          padding: '10px 24px',
        }),
        contained: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: '#fff',
          '&:hover': { backgroundColor: theme.palette.primary.dark },
          '&.Mui-disabled': {
            backgroundColor: theme.palette.divider,
            color: theme.palette.text.secondary,
          },
        }),
      },
    },
    MuiLink: {
      defaultProps: { underline: 'none' },
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary,
          '&:hover': { color: theme.palette.primary.main },
        }),
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
  },
});

export default theme;
