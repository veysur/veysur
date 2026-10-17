import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BotCheck } from 'veysur-common'

import {
  BotProtectionCheck,
  BotProtectionLabels,
} from 'component/BotProtection/BotProtectionCheck'
import { BotChallenge } from 'component/BotProtection/BotProtectionProvider'
import { getApiBotProtection } from 'registry'

const LABELS: BotProtectionLabels = {
  label: 'Security check',
  checking: 'Running a security check',
  verified: 'Security check complete',
  failed: 'The security check could not be completed.',
  retry: 'Try again',
  providerCloudflare: '',
  providerGoogle: '',
}

/**
 * The bot check for an account form (login, signup). Render `element` in the
 * form, disable submit until `ready`, and call `take()` once per submit: a
 * solution works once, so `take()` hands it over and starts a fresh check.
 * `ready` is true straight away when the deployment has the check off.
 */
export function useAccountBotCheck() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [ready, setReady] = useState(false)
  const [round, setRound] = useState(0)
  const firstChallenge = useRef<BotChallenge | null>(null)
  const solved = useRef<BotCheck | null>(null)

  useEffect(() => {
    let current = true
    getApiBotProtection()
      .accountChallenge()
      .then((challenge) => {
        if (!current) return
        if (challenge.enabled) firstChallenge.current = challenge
        setEnabled(challenge.enabled)
      })
      // Fail closed: the check shows its own error and retry
      .catch(() => current && setEnabled(true))
    return () => {
      current = false
    }
  }, [])

  const fetchChallenge = useCallback(async (): Promise<BotChallenge> => {
    const first = firstChallenge.current
    firstChallenge.current = null
    if (first) return first
    const challenge = await getApiBotProtection().accountChallenge()
    if (!challenge.enabled) throw new Error('Bot check disabled')
    return challenge
  }, [])

  const verify = useCallback(async (token: string, honeypot: string) => {
    solved.current = { token, honeypot }
    setReady(true)
  }, [])

  const take = useCallback((): BotCheck | undefined => {
    const botCheck = solved.current ?? undefined
    solved.current = null
    setReady(false)
    setRound((count) => count + 1)
    return botCheck
  }, [])

  const element: React.ReactNode = enabled ? (
    <BotProtectionCheck
      key={round}
      provider="simple"
      siteKey=""
      verified={false}
      fetchChallenge={fetchChallenge}
      verify={verify}
      labels={LABELS}
    />
  ) : null

  return { ready: enabled === false || ready, take, element }
}
