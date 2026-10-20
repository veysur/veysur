import type {
  CookieCategory,
  CookieInfo,
} from 'component/CookieConsent/cookieCatalog'

/** Cookies an extension sets, by the consent category they belong to. */
export type ExtraCookies = Partial<Record<CookieCategory['id'], CookieInfo[]>>

/** An extra gtag destination an extension configures after core's analytics tag. */
export type ExtraGtagConfig = {
  id: string
  config?: Record<string, unknown>
}
