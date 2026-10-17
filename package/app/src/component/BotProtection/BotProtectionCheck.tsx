import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, ShieldCheck } from 'lucide-react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import {
  BotChallenge,
  BotProtectionProviderName,
} from './BotProtectionProvider'
import { loadBotProtectionProvider } from './loadBotProtectionProvider'

export type BotProtectionLabels = {
  label: string
  checking: string
  verified: string
  failed: string
  retry: string
  providerCloudflare: string
  providerGoogle: string
}

type Props = {
  provider: BotProtectionProviderName
  siteKey: string
  verified: boolean
  fetchChallenge: () => Promise<BotChallenge>
  /** Sends the provider token and the honeypot value to the API. */
  verify: (token: string, honeypot: string) => Promise<void>
  labels: BotProtectionLabels
}

/**
 * Runs a bot check and hands the result to `verify`. Third-party providers
 * draw into `container` only if they need the participant to act; the
 * honeypot is a field people never see. Strings come in as `labels`, so it
 * works in apps with no i18n (account) as well as in the survey.
 */
export const BotProtectionCheck: React.FC<Props> = ({
  provider,
  siteKey,
  verified,
  fetchChallenge,
  verify,
  labels,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const latest = useRef({ fetchChallenge, verify })
  const [passed, setPassed] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const run = useCallback(
    async (isCurrent: () => boolean): Promise<boolean> => {
      try {
        const loaded = await loadBotProtectionProvider(provider)
        const token = await loaded.solve({
          container: containerRef.current as HTMLElement,
          siteKey,
          fetchChallenge: () => latest.current.fetchChallenge(),
        })
        if (!isCurrent()) return false
        await latest.current.verify(token, honeypotRef.current?.value ?? '')
        return true
      } catch {
        return false
      }
    },
    [provider, siteKey],
  )

  useEffect(() => {
    latest.current = { fetchChallenge, verify }
  })

  useEffect(() => {
    if (verified) return
    let current = true
    void run(() => current).then((passed) => {
      if (!current) return
      if (passed) setPassed(true)
      else setFailed(true)
    })
    return () => {
      current = false
    }
  }, [verified, run, attempt])

  const status = verified || passed ? 'done' : failed ? 'failed' : 'checking'

  const retry = () => {
    setFailed(false)
    setAttempt((count) => count + 1)
  }

  return (
    <section
      className="bot-protection-gate flex flex-col gap-2"
      aria-label={labels.label}
    >
      <div ref={containerRef} />
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div role="status" aria-live="polite" className="text-sm">
        {status === 'checking' && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {labels.checking}
          </span>
        )}
        {status === 'done' && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            {labels.verified}
          </span>
        )}
      </div>
      {status === 'failed' && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-2">
            {labels.failed}
            <Button variant="outline" size="sm" onClick={retry}>
              {labels.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {provider !== 'simple' && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {provider === 'cloudflare'
            ? labels.providerCloudflare
            : labels.providerGoogle}
        </p>
      )}
    </section>
  )
}
