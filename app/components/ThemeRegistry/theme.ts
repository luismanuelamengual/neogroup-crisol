import { createTheme } from '@mui/material/styles'

/**
 * Bright cartoon MUI theme: royal blue panels framed in thick rounded gold,
 * chunky glossy buttons, Lilita One for titles and buttons and Nunito for text.
 * The same values are exposed to SASS as CSS custom properties in
 * app/globals.scss — keep both in sync.
 */
export const GAME_COLORS = {
  gold: '#ffc93c',
  goldLight: '#ffe89a',
  goldDark: '#c4791a',
  cyan: '#4fc3ff',
  cyanDark: '#1a6fc4',
  magenta: '#ff5a5a',
  magentaDark: '#b3202c',
  lime: '#7ee05a',
  limeDark: '#3a9a2a',
  night: '#15124a',
  nightLight: '#211d63',
  panel: '#2c2f86',
  panelBorder: '#f2b53a',
  text: '#ffffff',
  textSecondary: '#c9cff5'
}

/** The dark outline around frames and buttons. */
const OUTLINE = '#12103a'
/** Round gold studs on the top corners of a window (the .frame-corners class of globals.scss). */
const CORNER = {
  content: '""',
  position: 'absolute',
  top: -7,
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${GAME_COLORS.goldLight} 0%, ${GAME_COLORS.gold} 50%, ${GAME_COLORS.goldDark} 100%)`,
  boxShadow: `0 0 0 2px ${OUTLINE}`,
  pointerEvents: 'none'
} as const
/** The chunky gold frame of every window (also --frame-* in globals.scss). */
const FRAME = {
  border: `3px solid ${GAME_COLORS.panelBorder}`,
  borderRadius: 16,
  background: 'linear-gradient(180deg, #3e42a0 0%, #262a74 100%)',
  boxShadow: `0 0 0 3px ${OUTLINE}, 0 6px 0 3px ${OUTLINE}, inset 0 2px 0 rgba(255,255,255,0.22), 0 14px 40px rgba(0,0,0,0.45)`
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: GAME_COLORS.gold, dark: GAME_COLORS.goldDark, contrastText: '#4a2604' },
    secondary: { main: GAME_COLORS.cyan, dark: GAME_COLORS.cyanDark, contrastText: '#ffffff' },
    error: { main: GAME_COLORS.magenta },
    success: { main: GAME_COLORS.lime },
    background: { default: GAME_COLORS.night, paper: GAME_COLORS.panel },
    text: { primary: GAME_COLORS.text, secondary: GAME_COLORS.textSecondary },
    divider: GAME_COLORS.panelBorder
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: 'var(--font-body), "Segoe UI", Roboto, Arial, sans-serif',
    h1: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.5 },
    h2: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.5 },
    h3: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.5 },
    h4: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.5 },
    h5: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.3 },
    h6: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.3 },
    button: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      letterSpacing: 0.5,
      textTransform: 'none'
    }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 14,
          padding: '9px 20px',
          transition: 'transform 80ms ease, filter 120ms ease',
          '&:active': { transform: 'translateY(3px)' }
        }
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            border: `2px solid ${OUTLINE}`,
            background: `linear-gradient(180deg, ${GAME_COLORS.goldLight} 0%, ${GAME_COLORS.gold} 45%, #e08a12 100%)`,
            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.55), 0 4px 0 ${OUTLINE}`,
            '&:hover': { filter: 'brightness(1.08)' }
          }
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            border: `2px solid ${OUTLINE}`,
            background: `linear-gradient(180deg, #b8e8ff 0%, ${GAME_COLORS.cyan} 45%, ${GAME_COLORS.cyanDark} 100%)`,
            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.55), 0 4px 0 ${OUTLINE}`,
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
          backgroundColor: 'rgba(18, 16, 58, 0.7)',
          borderRadius: 12,
          '& .MuiOutlinedInput-notchedOutline': { borderWidth: 1, borderColor: GAME_COLORS.panelBorder },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GAME_COLORS.gold },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GAME_COLORS.gold, borderWidth: 2 },
          '&.Mui-focused': { boxShadow: '0 0 12px rgba(255, 201, 60, 0.4)' }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.5 }
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
          letterSpacing: 0.5,
          textShadow: `0 3px 0 ${OUTLINE}`
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
          border: `2px solid ${GAME_COLORS.panelBorder}`,
          borderRadius: 10,
          background: 'rgba(33, 29, 99, 0.97)',
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
        thumb: { borderRadius: '50%', border: `2px solid ${OUTLINE}` }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 700 }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: GAME_COLORS.panelBorder }
      }
    }
  }
})
