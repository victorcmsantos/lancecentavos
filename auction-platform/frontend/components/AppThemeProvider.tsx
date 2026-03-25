'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import {
  alpha,
  createTheme,
  CssBaseline,
  PaletteMode,
  ThemeProvider
} from '@mui/material';

type AppThemeProviderProps = {
  brandColor: string;
  children: ReactNode;
};

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggleColorMode: () => {}
});

function createAppTheme(mode: PaletteMode, brandColor: string) {
  const isDark = mode === 'dark';
  const backgroundDefault = isDark ? '#101214' : '#f7f1e8';
  const backgroundPaper = isDark ? alpha('#171b1f', 0.94) : alpha('#fffaf4', 0.94);
  const baseTheme = createTheme();

  return createTheme({
    palette: {
      mode,
      primary: {
        main: brandColor
      },
      secondary: {
        main: '#c4622d'
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper
      },
      text: {
        primary: isDark ? '#f5efe6' : '#161412',
        secondary: isDark ? '#b8ada0' : '#6d6258'
      },
      divider: isDark ? 'rgba(245, 239, 230, 0.12)' : 'rgba(22, 20, 18, 0.1)'
    },
    shadows: baseTheme.shadows.map(() => 'none') as typeof baseTheme.shadows,
    shape: {
      borderRadius: 2
    },
    typography: {
      fontFamily: 'var(--font-body), sans-serif',
      h1: {
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.04em'
      },
      h2: {
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.04em'
      },
      h3: {
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.03em'
      },
      h4: {
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.02em'
      },
      h5: {
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 700
      },
      h6: {
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 700
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode
          },
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(circle at top left, rgba(245,239,230,0.04), transparent 28%), linear-gradient(180deg, #101214 0%, #171b1f 100%)'
              : 'radial-gradient(circle at top left, rgba(196,98,45,0.08), transparent 24%), linear-gradient(180deg, #fbf7f2 0%, #f7f1e8 100%)',
            backgroundAttachment: 'fixed'
          }
        }
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0
        },
        styleOverrides: {
          root: {
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isDark ? 'rgba(245,239,230,0.12)' : 'rgba(22,20,18,0.1)'}`,
            boxShadow: isDark
              ? '0 24px 60px -44px rgba(0,0,0,0.72)'
              : '0 24px 60px -44px rgba(28, 24, 18, 0.18)'
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            paddingInline: 18,
            paddingBlock: 10
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 700
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 12
          }
        }
      }
    }
  });
}

export function useAppColorMode() {
  return useContext(ColorModeContext);
}

export function AppThemeProvider({ brandColor, children }: AppThemeProviderProps) {
  const [mode, setMode] = useState<PaletteMode>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('color_mode');
    if (stored === 'dark' || stored === 'light') {
      setMode(stored);
      return;
    }

    const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setMode(preferredDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    window.localStorage.setItem('color_mode', mode);
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode, brandColor), [mode, brandColor]);
  const value = useMemo(
    () => ({
      mode,
      toggleColorMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark'))
    }),
    [mode]
  );

  return (
    <AppRouterCacheProvider>
      <ColorModeContext.Provider value={value}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
