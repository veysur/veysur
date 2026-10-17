export const BOT_PROTECTION_PROVIDER_NONE = 'none'
export const BOT_PROTECTION_PROVIDER_CLOUDFLARE = 'cloudflare'
export const BOT_PROTECTION_PROVIDER_GOOGLE = 'google'
export const BOT_PROTECTION_PROVIDER_SIMPLE = 'simple'

export const BOT_PROTECTION_PROVIDERS = [
  BOT_PROTECTION_PROVIDER_NONE,
  BOT_PROTECTION_PROVIDER_CLOUDFLARE,
  BOT_PROTECTION_PROVIDER_GOOGLE,
  BOT_PROTECTION_PROVIDER_SIMPLE,
] as const

export type BotProtectionProvider = (typeof BOT_PROTECTION_PROVIDERS)[number]

export interface BotProtectionKeys {
  siteKey?: string | null
  secretKey?: string | null
}

/** The project `botProtection` setting; unset fields arrive as null or absent. */
export interface BotProtectionSetting {
  provider?: string | null
  cloudflare?: BotProtectionKeys | null
  google?: BotProtectionKeys | null
}

/**
 * The `simple` challenge scope for checks outside a survey (login, signup).
 * Survey scopes are survey ids, which can never equal this, so a challenge
 * issued for one cannot be redeemed for the other.
 */
export const BOT_PROTECTION_ACCOUNT_SCOPE = 'account'

/** The solved check an account form sends in its request body. */
export interface BotCheck {
  token: string
  /** Value of the hidden honeypot field; anything non-empty fails the check. */
  honeypot?: string | null
}

/** What a participant's browser needs; never carries a secret key. */
export interface ResolvedBotProtection {
  provider: BotProtectionProvider
  /** Empty for `none` and `simple`, which need no site key. */
  siteKey: string
}

const NONE: ResolvedBotProtection = {
  provider: BOT_PROTECTION_PROVIDER_NONE,
  siteKey: '',
}

/**
 * The check a survey really applies. Protection is on only when the survey
 * asks for it (`access.botProtection`) and the project provider is usable; a
 * Cloudflare or Google provider missing either key resolves to `none` so a
 * half-configured project never locks participants out.
 */
export function resolveBotProtection(
  setting: BotProtectionSetting | null | undefined,
  surveyEnabled: boolean | null | undefined,
): ResolvedBotProtection {
  if (!surveyEnabled) {
    return NONE
  }
  switch (setting?.provider) {
    case BOT_PROTECTION_PROVIDER_SIMPLE:
      return { provider: BOT_PROTECTION_PROVIDER_SIMPLE, siteKey: '' }
    case BOT_PROTECTION_PROVIDER_CLOUDFLARE:
    case BOT_PROTECTION_PROVIDER_GOOGLE: {
      const keys = setting[setting.provider]
      const siteKey = keys?.siteKey?.trim() || ''
      const secretKey = keys?.secretKey?.trim() || ''
      return siteKey && secretKey
        ? { provider: setting.provider, siteKey }
        : NONE
    }
    default:
      return NONE
  }
}
