import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'cookieConsent' // must match app's KEY_STATE_COOKIE_CONSENT value
const CONSENT_VERSION = '1.1'

type CookieConsentData = {
  hasConsented: boolean
  functional: boolean
  analytics: boolean
  consentedAt: string | null
  version: string
}

const DEFAULT_CONSENT: CookieConsentData = {
  hasConsented: false,
  functional: false,
  analytics: false,
  consentedAt: null,
  version: CONSENT_VERSION,
}

function readFromStorage(): CookieConsentData {
  if (typeof window === 'undefined') return { ...DEFAULT_CONSENT }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONSENT }
    const parsed: CookieConsentData = JSON.parse(raw)
    if (parsed.version !== CONSENT_VERSION) return { ...DEFAULT_CONSENT }
    return parsed
  } catch {
    return { ...DEFAULT_CONSENT }
  }
}

function writeToStorage(data: CookieConsentData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(data) }))
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsentData>(readFromStorage)

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setConsent(readFromStorage())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const save = useCallback(
    (update: Partial<CookieConsentData>) => {
      const next: CookieConsentData = {
        ...consent,
        ...update,
        consentedAt: new Date().toISOString(),
        version: CONSENT_VERSION,
      }
      writeToStorage(next)
      setConsent(next)
    },
    [consent],
  )

  const acceptAll = useCallback(() => save({ hasConsented: true, functional: true, analytics: true }), [save])
  const acceptEssentialOnly = useCallback(() => save({ hasConsented: true, functional: false, analytics: false }), [save])
  const savePreferences = useCallback(
    (functional: boolean, analytics: boolean) => save({ hasConsented: true, functional, analytics }),
    [save],
  )
  const resetConsent = useCallback(() => {
    const next = { ...DEFAULT_CONSENT }
    writeToStorage(next)
    setConsent(next)
  }, [])

  return {
    hasConsented: consent.hasConsented,
    functional: consent.functional,
    analytics: consent.analytics,
    consentedAt: consent.consentedAt,
    acceptAll,
    acceptEssentialOnly,
    savePreferences,
    resetConsent,
  }
}
