import type {
  CookieCategory,
  CookieInfo,
} from 'component/CookieConsent/cookieCatalog'

/** Cookies an overlay sets, by the consent category they belong to. */
export type ExtraCookies = Partial<Record<CookieCategory['id'], CookieInfo[]>>
