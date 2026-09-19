import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { KEY_STATE_COOKIE_CONSENT } from 'common/keyState'

const CONSENT_VERSION = '1.1'

export type CookieConsentData = {
  hasConsented: boolean
  functional: boolean
  analytics: boolean
  consentedAt: string | null
  version: string
}

const defaultConsent: CookieConsentData = {
  hasConsented: false,
  functional: false,
  analytics: false,
  consentedAt: null,
  version: CONSENT_VERSION,
}

const queryKey = [KEY_STATE_COOKIE_CONSENT]

export function useCookieConsent() {
  const queryClient = useQueryClient()

  const { data } = useQuery<CookieConsentData>({
    queryKey,
    queryFn: () => defaultConsent,
    staleTime: Infinity,
    gcTime: Infinity,
    meta: {
      persistence: {
        enabled: true,
        storageType: 'local',
      },
    },
    select: (consent) => {
      // Re-prompt if consent was given under a different version
      if (consent.version !== CONSENT_VERSION) {
        return { ...defaultConsent }
      }
      return consent
    },
  })

  const consent = data ?? defaultConsent

  const save = useCallback(
    (update: Partial<CookieConsentData>) => {
      queryClient.setQueryData<CookieConsentData>(queryKey, (prev) => ({
        ...(prev ?? defaultConsent),
        ...update,
        consentedAt: new Date().toISOString(),
        version: CONSENT_VERSION,
      }))
    },
    [queryClient],
  )

  const acceptAll = useCallback(() => {
    save({ hasConsented: true, functional: true, analytics: true })
  }, [save])

  const acceptEssentialOnly = useCallback(() => {
    save({ hasConsented: true, functional: false, analytics: false })
  }, [save])

  const savePreferences = useCallback(
    (functional: boolean, analytics: boolean) => {
      save({ hasConsented: true, functional, analytics })
    },
    [save],
  )

  const resetConsent = useCallback(() => {
    queryClient.setQueryData<CookieConsentData>(queryKey, defaultConsent)
  }, [queryClient])

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
