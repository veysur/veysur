import { BotProtectionSetting } from 'veysur-common'

const KEYED_PROVIDERS = ['cloudflare', 'google'] as const

type MaskedKeys = {
  siteKey: string | null
  secretKey: string | null
  hasSecret: boolean
}

export type MaskedBotProtection = Omit<
  BotProtectionSetting,
  'cloudflare' | 'google'
> & { cloudflare?: MaskedKeys; google?: MaskedKeys }

/**
 * The setting as an admin may read it back: secret keys are write-only, so
 * each is blanked and `hasSecret` says whether one is stored. A null key on
 * a survey means it inherits the project value, so null is kept as null.
 */
export function maskBotProtectionSecrets(
  setting: BotProtectionSetting | null | undefined,
): MaskedBotProtection | null | undefined {
  if (!setting) return setting as null | undefined
  const masked: MaskedBotProtection = { provider: setting.provider }
  for (const provider of KEYED_PROVIDERS) {
    const keys = setting[provider]
    masked[provider] = {
      siteKey: keys?.siteKey === null ? null : (keys?.siteKey ?? ''),
      secretKey: keys?.secretKey === null ? null : '',
      hasSecret: !!keys?.secretKey,
    } satisfies MaskedKeys
  }
  return masked
}

/**
 * Prepare an admin's botProtection write for storage. A blank or absent
 * `secretKey` keeps the stored one (the form never receives it), and the
 * read-only `hasSecret` flag is dropped. With `nullInherits` (a survey), an
 * explicit null key is stored as null so the survey inherits the project's.
 */
export function mergeBotProtectionSecrets(
  incoming: BotProtectionSetting,
  stored: BotProtectionSetting | null | undefined,
  { nullInherits = false }: { nullInherits?: boolean } = {},
): BotProtectionSetting {
  const merged: BotProtectionSetting = { ...incoming }
  for (const provider of KEYED_PROVIDERS) {
    if (!incoming[provider]) continue
    const { siteKey, secretKey } = incoming[provider]
    merged[provider] = {
      siteKey:
        nullInherits && siteKey === null
          ? null
          : (siteKey ?? stored?.[provider]?.siteKey ?? ''),
      secretKey:
        nullInherits && secretKey === null
          ? null
          : secretKey?.trim() || stored?.[provider]?.secretKey || '',
    }
  }
  return merged
}
