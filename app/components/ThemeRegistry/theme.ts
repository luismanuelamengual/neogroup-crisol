import { createTheme } from '@mui/material/styles'

/**
 * "Arcade" MUI theme: dark night-blue surfaces, saturated accents, chunky
 * rounded shapes and display typography. The same values are exposed to SASS
 * as CSS custom properties in app/globals.scss — keep both in sync.
 */
export const GAME_COLORS = {
  gold: '#ffc233',
  goldDark: '#c98a00',
  cyan: '#22d3ee',
  cyanDark: '#0e8aa0',
  magenta: '#ff4d8d',
  magentaDark: '#b3245a',
  lime: '#84f06b',
  limeDark: '#3f9e2c',
  night: '#0b1026',
  nightLight: '#151c3d',
  panel: '#1b2350',
  panelBorder: '#3a4690',
  text: '#f8fafc',
  textSecondary: '#aab4e8'
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: GAME_COLORS.gold, dark: GAME_COLORS.goldDark, contrastText: '#1a1300' },
    secondary: { main: GAME_COLORS.cyan, dark: GAME_COLORS.cyanDark, contrastText: '#03222a' },
    error: { main: GAME_COLORS.magenta },
    success: { main: GAME_COLORS.lime },
    background: { default: GAME_COLORS.night, paper: GAME_COLORS.panel },
    text: { primary: GAME_COLORS.text, secondary: GAME_COLORS.textSecondary },
    divider: GAME_COLORS.panelBorder
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: 'var(--font-body), "Segoe UI", Roboto, Arial, sans-serif',
    h1: { fontFamily: 'var(--font-display)', letterSpacing: 1 },
    h2: { fontFamily: 'var(--font-display)', letterSpacing: 1 },
    h3: { fontFamily: 'var(--font-display)', letterSpacing: 1 },
    h4: { fontFamily: 'var(--font-display)', letterSpacing: 1 },
    h5: { fontFamily: 'var(--font-display)', letterSpacing: 0.5 },
    h6: { fontFamily: 'var(--font-display)', letterSpacing: 0.5 },
    button: {
      fontFamily: 'var(--font-display)',
      letterSpacing: 1,
      textTransform: 'uppercase'
    }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 14,
          padding: '10px 22px',
          transition: 'transform 80ms ease, box-shadow 80ms ease, filter 120ms ease',
          '&:active': { transform: 'translateY(3px)' }
        }
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            boxShadow: `0 5px 0 ${GAME_COLORS.goldDark}`,
            '&:hover': { backgroundColor: GAME_COLORS.gold, filter: 'brightness(1.08)' },
            '&:active': { boxShadow: `0 2px 0 ${GAME_COLORS.goldDark}` }
          }
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            boxShadow: `0 5px 0 ${GAME_COLORS.cyanDark}`,
            '&:hover': { backgroundColor: GAME_COLORS.cyan, filter: 'brightness(1.08)' },
            '&:active': { boxShadow: `0 2px 0 ${GAME_COLORS.cyanDark}` }
          }
        },
        {
          props: { variant: 'outlined' },
          style: { borderWidth: 3, '&:hover': { borderWidth: 3 } }
        }
      ]
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: GAME_COLORS.nightLight,
          borderRadius: 12,
          '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2, borderColor: GAME_COLORS.panelBorder },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GAME_COLORS.cyan },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GAME_COLORS.gold, borderWidth: 3 }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `3px solid ${GAME_COLORS.panelBorder}`,
          borderRadius: 20,
          boxShadow: '0 8px 0 rgba(0,0,0,0.45)'
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        // Chunky GameButtons don't fit side by side on narrow phones: let them
        // wrap and, below the sm breakpoint, stretch to fill each row.
        root: {
          flexWrap: 'wrap',
          '& > :not(style) ~ :not(style)': { marginLeft: 0 },
          '@media (max-width: 599.95px)': {
            '& > *': { flexGrow: 1 }
          }
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: `3px solid ${GAME_COLORS.panelBorder}`,
          borderRadius: 16
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 600 }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: GAME_COLORS.panelBorder }
      }
    }
  }
})
