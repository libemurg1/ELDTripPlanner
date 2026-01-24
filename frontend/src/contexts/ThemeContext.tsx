import React, { createContext, useContext, useEffect, useState } from 'react'

// Theme configuration
export const themeConfig = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172b4d',
    },
    secondary: {
      50: '#fef2f2',
      100: '#fef3c7',
      200: '#fde8e0',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#a7f3d0',
      400: '#34d399',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172b4d',
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#a2a2aa',
      500: '#718096',
      600: '#4b5563',
      700: '#2d3748',
      800: '#1a202c',
      900: '#111827',
      950: '#0c0a09',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
    },
    fontWeight: {
      thin: '100',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 1.75,
    },
  },
  spacing: {
    0: '0px',
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
    px: '1px',
  },
  borderRadius: {
    none: '0px',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    base: '0 4px 6px 0 rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px 0 rgba(0, 0, 0, 0.12)',
    lg: '0 20px 25px 0 rgba(0, 0, 0, 0.15)',
    xl: '0 25px 50px 0 rgba(0, 0, 0, 0.19)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  screens: {
    mobile: { max: '767px' },
    tablet: { min: '768px', max: '1023px' },
    desktop: { min: '1024px' },
  },
  transitions: {
    ease: 'ease-in-out(0.2s)',
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
  },
  animations: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: '300ms',
      ease: 'ease-in-out',
    },
    slideIn: {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
      duration: '300ms',
      ease: 'ease-in-out',
    },
    bounce: {
      '0%, 20%, 53%, 80%, 100%': {
        transform: 'translateY(0)',
        animationTimingFunction: 'cubic-bezier(0.8, 0.0, 1, 1)',
      },
      '40%, 43%': {
        transform: 'translateY(-30px)',
        animationTimingFunction: 'cubic-bezier(0.8, 0.0, 1, 1)',
      },
      '70%': {
        transform: 'translateY(0)',
        animationTimingFunction: 'cubic-bezier(0.8, 0.0, 1, 1)',
      },
      '80%': {
        transform: 'translateY(-15px)',
        animationTimingFunction: 'cubic-bezier(0.8, 0.0, 1, 1)',
      },
    },
  },
}

// Light theme
export const lightTheme = {
  ...themeConfig,
  colors: {
    ...themeConfig.colors,
    background: '#ffffff',
    foreground: '#111827',
    card: '#ffffff',
    cardForeground: '#111827',
    border: '#e5e7eb',
    input: '#ffffff',
    inputForeground: '#374151',
    ring: '#3b82f6',
    muted: '#9ca3af',
    mutedForeground: '#6b7280',
    accent: themeConfig.colors.primary,
    destructive: themeConfig.colors.error,
  },
}

// Dark theme
export const darkTheme = {
  ...themeConfig,
  colors: {
    ...themeConfig.colors,
    background: '#111827',
    foreground: '#f9fafb',
    card: '#1f2937',
    cardForeground: '#f9fafb',
    border: '#374151',
    input: '#1f2937',
    inputForeground: '#f3f4f6',
    ring: '#3b82f6',
    muted: '#6b7280',
    mutedForeground: '#9ca3af',
    accent: themeConfig.colors.primary,
    destructive: themeConfig.colors.error,
  },
}

// ELD-specific theme colors for compliance
export const eldTheme = {
  status: {
    off_duty: themeConfig.colors.success[500],
    on_duty_not_driving: themeConfig.colors.warning[500],
    driving: themeConfig.colors.error[500],
    sleeper_berth: themeConfig.colors.info[500],
  },
  compliance: {
    compliant: themeConfig.colors.success[600],
    warning: themeConfig.colors.warning[600],
    violation: themeConfig.colors.error[600],
    needs_attention: themeConfig.colors.info[600],
  },
  map: {
    route: themeConfig.colors.primary[600],
    fuel_stop: themeConfig.colors.secondary[500],
    rest_stop: themeConfig.colors.info[500],
    pickup: themeConfig.colors.success[500],
    dropoff: themeConfig.colors.error[500],
    current_location: themeConfig.colors.primary[700],
  },
  dashboard: {
    primary: themeConfig.colors.primary,
    secondary: themeConfig.colors.secondary,
    success: themeConfig.colors.success,
    warning: themeConfig.colors.warning,
    error: themeConfig.colors.error,
    background: themeConfig.colors.gray[50],
    surface: '#ffffff',
    text: themeConfig.colors.gray[900],
  },
}

export type Theme = typeof lightTheme

export interface ThemeContextType {
  theme: Theme
  mode: 'light' | 'dark' | 'system'
  setTheme: (mode: 'light' | 'dark' | 'system') => void
  toggleTheme: () => void
  isDarkMode: boolean
  isLoading: boolean
}

// Theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system')
  const [theme, setTheme] = useState<Theme>(lightTheme)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Detect system preference
  const detectSystemTheme = (): 'light' | 'dark' => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  // Initialize theme based on mode and system preference
  useEffect(() => {
    setIsLoading(true)
    if (mode === 'system') {
      const systemTheme = detectSystemTheme()
      setTheme(systemTheme === 'dark' ? darkTheme : lightTheme)
      setIsDarkMode(systemTheme === 'dark')
    } else {
      setTheme(mode === 'dark' ? darkTheme : lightTheme)
      setIsDarkMode(mode === 'dark')
    }
    setIsLoading(false)
  }, [mode])

  // Listen for system theme changes
  useEffect(() => {
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? darkTheme : lightTheme
        setTheme(newTheme)
        setIsDarkMode(e.matches)
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [mode])

  const toggleTheme = () => {
    setMode(prevMode => {
      if (prevMode === 'light') return 'dark'
      if (prevMode === 'dark') return 'system'
      if (prevMode === 'system') return 'light'
      return prevMode
    })
  }

  const contextValue: ThemeContextType = {
    theme,
    mode,
    setTheme,
    toggleTheme,
    isDarkMode,
    isLoading,
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}