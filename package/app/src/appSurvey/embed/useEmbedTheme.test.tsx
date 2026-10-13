import { act, renderHook } from '@testing-library/react'

import { EMBED_THEME_MESSAGE, useEmbedTheme } from './useEmbedTheme'

function post(data: unknown, source: MessageEventSource | null) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, source }))
  })
}

describe('useEmbedTheme', () => {
  beforeEach(() => {
    document.documentElement.className = 'light'
  })

  it('applies a theme sent by the parent window', () => {
    renderHook(() => useEmbedTheme())
    post({ type: EMBED_THEME_MESSAGE, theme: 'dark' }, window.parent)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('ignores messages from other windows', () => {
    renderHook(() => useEmbedTheme())
    post({ type: EMBED_THEME_MESSAGE, theme: 'dark' }, null)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('ignores unknown themes and message types', () => {
    renderHook(() => useEmbedTheme())
    post({ type: EMBED_THEME_MESSAGE, theme: 'purple' }, window.parent)
    post({ type: 'other', theme: 'dark' }, window.parent)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
