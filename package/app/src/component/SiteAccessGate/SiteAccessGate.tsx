// cspell:ignore noindex
import React, { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'

import { GoldenCentered } from 'component/GoldenCentered'
import { Card, CardContent } from 'component/shadcn/card'

const REQUIRED_SALT = process.env.PUBLIC_SITE_ACCESS_SALT ?? ''
const REQUIRED_HASH = process.env.PUBLIC_SITE_ACCESS_HASH ?? ''
const TITLE = process.env.PUBLIC_SITE_UNAVAILABLE_TITLE ?? 'Site Unavailable'
const MESSAGE =
  process.env.PUBLIC_SITE_UNAVAILABLE_MESSAGE ??
  'This site is not available at this time.'

const COOKIE_NAME = 'site_access'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

function getAccessCookie(): string | undefined {
  return document.cookie
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === COOKIE_NAME)?.[1]
}

function setAccessCookie(value: string): void {
  const domain = window.location.hostname.split('.').slice(-2).join('.')
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict; domain=.${domain}`
}

interface Props {
  children: React.ReactNode
}

async function hashCandidateKey(candidate: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(REQUIRED_SALT + candidate),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const SiteAccessGate: React.FC<Props> = ({ children }) => {
  const [accessible, setAccessible] = useState<boolean | null>(() =>
    REQUIRED_HASH ? null : true,
  )

  useEffect(() => {
    if (!REQUIRED_HASH) return

    let cancelled = false
    void (async () => {
      const params = new URLSearchParams(window.location.search)
      const urlKey = params.get('access_key')
      if (urlKey) {
        setAccessCookie(urlKey)
        params.delete('access_key')
        const newUrl =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : '')
        window.history.replaceState({}, '', newUrl)
      }

      const hash = await hashCandidateKey(getAccessCookie() ?? '')
      if (!cancelled) setAccessible(hash === REQUIRED_HASH)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!REQUIRED_HASH) return
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  if (accessible === null) return null

  if (!accessible) {
    return (
      <GoldenCentered
        className="min-h-screen"
        topOffset="0"
        maxWidth="max-w-sm"
      >
        <Card>
          <CardContent className="flex flex-col items-center text-center py-10 px-8">
            <img
              src="/image/veysur-logo-light.svg"
              alt="VeySur"
              className="h-12 w-auto dark:hidden mb-6"
            />
            <img
              src="/image/veysur-logo-dark.svg"
              alt="VeySur"
              className="h-12 w-auto hidden dark:block mb-6"
            />
            <div className="inline-flex items-center justify-center rounded-full bg-muted p-4 mb-4">
              <Lock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{TITLE}</h2>
            <p className="text-muted-foreground">{MESSAGE}</p>
          </CardContent>
        </Card>
      </GoldenCentered>
    )
  }

  return <>{children}</>
}
