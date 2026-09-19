import { useEffect, useRef } from 'react'
import { useCookieConsent } from '../hook/useCookieConsent'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

type Props = {
  tagId: string
}

export default function GoogleAnalytics({ tagId }: Props) {
  const initialized = useRef(false)
  const { analytics } = useCookieConsent()
  const previousAnalytics = useRef(analytics)

  useEffect(() => {
    if (!tagId || initialized.current) return
    initialized.current = true

    // dataLayer/gtag and the consent default are already set up synchronously by the
    // Starlight head script (astro.config.mjs) — must happen before any tag or script
    // touches consent, which this React island (client:only, hydrates late) cannot do.
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args))

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${tagId}`
    script.onload = () => {
      window.gtag('js', new Date())
      window.gtag('config', tagId)
    }
    document.head.appendChild(script)
  }, [tagId])

  // Update consent gate whenever the user grants or revokes analytics consent.
  // All four declared types must be resent on every update — GA4's strict consent
  // enforcement waits for an explicit on-page update for every type it tracks, not just
  // the one whose value actually changed, before it considers the signal resolved.
  useEffect(() => {
    if (!initialized.current) return
    window.gtag?.('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })

    // The initial page_view (fired at gtag('config', ...) time) may already have been
    // dropped under denied consent — GA4 does not reliably resend it once consent is
    // later granted, so fire an explicit page_view to guarantee this visit is recorded.
    if (analytics && !previousAnalytics.current) {
      window.gtag?.('event', 'page_view', {
        page_location: window.location.href,
        page_title: document.title,
      })
    }
    previousAnalytics.current = analytics
  }, [analytics])

  return null
}
