import { BotProtectionSetting } from 'veysur-common'

const KEYED_PROVIDERS = ['cloudflare', 'google'] as const

type MaskedKeys = { siteKey: string; secretKey: string; hasSecret: boolean }

export type MaskedBotProtection = Omit<
  BotProtectionSetting,
  'cloudflare' | 'google'
> & { cloudflare?: MaskedKeys; google?: MaskedKeys }

export function hasBotProtectionSecret(setting: BotProtectionSetting): boolean {
  return KEYED_PROVIDERS.some((provider) => !!setting[provider]?.secretKey)
}

/**
 * The setting as an admin may read it back: secret keys are write-only, so
 * each is blanked and `hasSecret` says whether one is stored.
 */
export function maskBotProtectionSecrets(
  setting: BotProtectionSetting | null | undefined,
): MaskedBotProtection | null | undefined {
  if (!setting) return setting as null | undefined
  const masked: MaskedBotProtection = { provider: setting.provider }
  for (const provider of KEYED_PROVIDERS) {
    const keys = setting[provider]
    masked[provider] = {
      siteKey: keys?.siteKey ?? '',
      secretKey: '',
      hasSecret: !!keys?.secretKey,
    } satisfies MaskedKeys
  }
  return masked
}

/**
 * Prepare an admin's botProtection write for storage. A blank or absent
 * `secretKey` keeps the stored one (the form never receives it), and the
 * read-only `hasSecret` flag is dropped.
 */
export function mergeBotProtectionSecrets(
  incoming: BotProtectionSetting,
  stored: BotProtectionSetting | null | undefined,
): BotProtectionSetting {
  const merged: BotProtectionSetting = { ...incoming }
  for (const provider of KEYED_PROVIDERS) {
    if (!incoming[provider]) continue
    const { siteKey, secretKey } = incoming[provider]
    merged[provider] = {
      siteKey: siteKey ?? stored?.[provider]?.siteKey ?? '',
      secretKey: secretKey?.trim() || stored?.[provider]?.secretKey || '',
    }
  }
  return merged
}
