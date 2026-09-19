import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const COOKIE_NAME = 'veysur-theme'

function getParentDomain(): string | null {
  const parts = window.location.hostname.split('.')
  if (parts.length < 2 || parts[0] === 'localhost') return null
  return parts.slice(-2).join('.')
}

function getThemeCookie(): Theme | null {
  const match = document.cookie.match(/(?:^|;\s*)veysur-theme=([^;]+)/)
  return match ? (match[1] as Theme) : null
}

function setThemeCookie(theme: Theme): void {
  const domain = getParentDomain()
  const domainAttr = domain ? `; domain=.${domain}` : ''
  document.cookie = `${COOKIE_NAME}=${theme}; path=/${domainAttr}; max-age=31536000; SameSite=Lax`
}

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    return getThemeCookie() ?? defaultTheme ?? 'light'
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    setThemeCookie(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setThemeCookie(theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
