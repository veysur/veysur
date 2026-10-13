import { useEffect } from 'react'

export const EMBED_THEME_MESSAGE = 'veysur:embed:theme'

type EmbedTheme = 'light' | 'dark'

// Same colours as the pre-render script in public/index.html, which avoids a flash.
const BACKGROUND: Record<EmbedTheme, string> = {
  light: '#ffffff',
  dark: '#0a0a0a',
}

function applyTheme(theme: EmbedTheme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.backgroundColor = BACKGROUND[theme]
}

// The host page's loader sends this when its theme changes. Only the parent window
// is trusted, and only the two known values are applied.
export function useEmbedTheme(): void {
  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== window.parent) return
      const data: unknown = event.data
      if (typeof data !== 'object' || data === null) return
      if (!('type' in data) || data.type !== EMBED_THEME_MESSAGE) return
      if (!('theme' in data)) return
      if (data.theme === 'light' || data.theme === 'dark') applyTheme(data.theme)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
}
