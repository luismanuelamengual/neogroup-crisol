import { createTheme } from '@mui/material/styles'

/**
 * Dark fantasy MUI theme: leather and stone surfaces framed in bronze, ember
 * and gold accents, Cinzel for titles and buttons. The same values are exposed
 * to SASS as CSS custom properties in app/globals.scss — keep both in sync.
 */
export const GAME_COLORS = {
  gold: '#e8b85a',
  goldLight: '#ffe2a0',
  goldDark: '#8a5a1c',
  cyan: '#74b4ff',
  cyanDark: '#1f4f9a',
  magenta: '#e5533d',
  magentaDark: '#7a1c10',
  lime: '#8fd46a',
  limeDark: '#3c6e22',
  night: '#0d0806',
  nightLight: '#1a110c',
  panel: '#241711',
  panelBorder: '#7a5524',
  text: '#f4e7cc',
  textSecondary: '#b8a07a'
}

/** Gold diamonds on the top corners of a window (the .frame-corners class of globals.scss). */
const CORNER = {
  content: '""',
  position: 'absolute',
  top: -7,
  width: 12,
  height: 12,
  background: `linear-gradient(135deg, ${GAME_COLORS.goldLight} 0%, ${GAME_COLORS.gold} 50%, ${GAME_COLORS.goldDark} 100%)`,
  boxShadow: '0 0 0 2px #0a0604',
  transform: 'rotate(45deg)',
  pointerEvents: 'none'
} as const
/** The ornate bronze frame of every window (also --frame-* in globals.scss). */
const FRAME = {
  border: '2px solid #a8793a',
  borderRadius: 4,
  background: 'linear-gradient(180deg, #2a1c14 0%, #140d09 100%)',
  boxShadow: '0 0 0 3px #0a0604, 0 0 0 4px #5a3c16, inset 0 0 18px rgba(0,0,0,0.65), 0 14px 40px rgba(0,0,0,0.6)'
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: GAME_COLORS.gold, dark: GAME_COLORS.goldDark, contrastText: '#2a1404' },
    secondary: { main: GAME_COLORS.cyan, dark: GAME_COLORS.cyanDark, contrastText: '#06142e' },
    error: { main: GAME_COLORS.magenta },
    success: { main: GAME_COLORS.lime },
    background: { default: GAME_COLORS.night, paper: GAME_COLORS.panel },
    text: { primary: GAME_COLORS.text, secondary: GAME_COLORS.textSecondary },
    divider: GAME_COLORS.panelBorder
  },
  shape: {
    borderRadius: 4
  },
  typography: {
    fontFamily: 'var(--font-body), "Segoe UI", Roboto, Arial, sans-serif',
    h1: { fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 1 },
    h2: { fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 1 },
    h3: { fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 1 },
    h4: { fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 1 },
    h5: { fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 0.5 },
    h6: { fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 0.5 },
    button: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      letterSpacing: 1.5,
      textTransform: 'uppercase'
    }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 3,
          padding: '9px 20px',
          transition: 'transform 80ms ease, filter 120ms ease',
          '&:active': { transform: 'translateY(2px)' }
        }
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            border: '1px solid #3a2208',
            background: `linear-gradient(180deg, ${GAME_COLORS.goldLight} 0%, ${GAME_COLORS.gold} 45%, #a8701e 100%)`,
            '&:hover': { filter: 'brightness(1.08)' }
          }
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            border: '1px solid #06142e',
            background: `linear-gradient(180deg, #a6d0ff 0%, ${GAME_COLORS.cyan} 45%, #2f62b0 100%)`,
            '&:hover': { filter: 'brightness(1.08)' }
          }
        },
        {
          props: { variant: 'outlined' },
          style: { borderWidth: 2, '&:hover': { borderWidth: 2 } }
        }
      ]
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 6, 4, 0.7)',
          borderRadius: 3,
          '& .MuiOutlinedInput-notchedOutline': { borderWidth: 1, borderColor: GAME_COLORS.panelBorder },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GAME_COLORS.gold },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GAME_COLORS.gold, borderWidth: 2 },
          '&.Mui-focused': { boxShadow: '0 0 12px rgba(255, 138, 42, 0.35)' }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 1 }
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
          ...FRAME,
          overflow: 'visible',
          '&::before': { ...CORNER, left: -7 },
          '&::after': { ...CORNER, right: -7 }
        },
        paperFullScreen: {
          overflowY: 'auto',
          '&::before, &::after': { display: 'none' }
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: GAME_COLORS.gold,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 2,
          textShadow: '0 2px 0 rgba(0,0,0,0.6)'
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
        paper: FRAME
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          border: '1px solid #a8793a',
          borderRadius: 3,
          background: 'rgba(20, 13, 9, 0.96)',
          color: GAME_COLORS.text,
          fontSize: '0.85rem'
        }
      }
    },
    MuiSwitch: {
      styleOverrides: {
        thumb: { backgroundColor: GAME_COLORS.text },
        track: { backgroundColor: GAME_COLORS.panelBorder, opacity: 1 }
      }
    },
    MuiSlider: {
      styleOverrides: {
        thumb: { borderRadius: 2, transform: 'translate(-50%, -50%) rotate(45deg)' }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 3, fontWeight: 600 }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: GAME_COLORS.panelBorder }
      }
    }
  }
})
