import {
  maskBotProtectionSecrets,
  mergeBotProtectionSecrets,
} from './botProtectionSecrets'

const stored = {
  provider: 'google',
  cloudflare: { siteKey: 'cf-site', secretKey: 'cf-secret' },
  google: { siteKey: 'g-site', secretKey: '' },
}

describe('maskBotProtectionSecrets', () => {
  test('blanks every secret and reports whether one is stored', () => {
    const masked = maskBotProtectionSecrets(stored)
    expect(masked.cloudflare).toEqual({
      siteKey: 'cf-site',
      secretKey: '',
      hasSecret: true,
    })
    expect(masked.google).toEqual({
      siteKey: 'g-site',
      secretKey: '',
      hasSecret: false,
    })
    expect(JSON.stringify(masked)).not.toContain('cf-secret')
  })

  test('passes a missing setting through', () => {
    expect(maskBotProtectionSecrets(undefined)).toBeUndefined()
  })
})

describe('mergeBotProtectionSecrets', () => {
  test('keeps the stored secret when the write leaves it blank', () => {
    const merged = mergeBotProtectionSecrets(
      {
        provider: 'cloudflare',
        cloudflare: { siteKey: 'new-site', secretKey: '' },
      },
      stored,
    )
    expect(merged.cloudflare).toEqual({
      siteKey: 'new-site',
      secretKey: 'cf-secret',
    })
  })

  test('replaces the secret when one is given', () => {
    const merged = mergeBotProtectionSecrets(
      { cloudflare: { siteKey: 'cf-site', secretKey: ' fresh ' } },
      stored,
    )
    expect(merged.cloudflare.secretKey).toBe('fresh')
  })

  test('drops the read-only hasSecret flag', () => {
    const merged = mergeBotProtectionSecrets(
      { google: { siteKey: 's', secretKey: 'k', hasSecret: true } } as never,
      undefined,
    )
    expect(merged.google).toEqual({ siteKey: 's', secretKey: 'k' })
  })
})
