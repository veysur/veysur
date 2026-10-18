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

describe('survey-level secrets (null inherits the project value)', () => {
  test('masking keeps null as null so the editor can show "inherited"', () => {
    const masked = maskBotProtectionSecrets({
      provider: null,
      cloudflare: { siteKey: null, secretKey: null },
      google: { siteKey: 'own', secretKey: 'own-secret' },
    })
    expect(masked.provider).toBeNull()
    expect(masked.cloudflare).toEqual({
      siteKey: null,
      secretKey: null,
      hasSecret: false,
    })
    expect(masked.google).toEqual({
      siteKey: 'own',
      secretKey: '',
      hasSecret: true,
    })
  })

  test('merge stores null when inheriting and keeps a blank secret otherwise', () => {
    const merged = mergeBotProtectionSecrets(
      {
        provider: 'google',
        cloudflare: { siteKey: null, secretKey: null },
        google: { siteKey: 'g-new', secretKey: '' },
      },
      { google: { siteKey: 'g-old', secretKey: 'g-secret' } },
      { nullInherits: true },
    )
    expect(merged.cloudflare).toEqual({ siteKey: null, secretKey: null })
    expect(merged.google).toEqual({ siteKey: 'g-new', secretKey: 'g-secret' })
  })

  test('without nullInherits a null falls back to the stored value (project)', () => {
    const merged = mergeBotProtectionSecrets(
      { cloudflare: { siteKey: null, secretKey: null } },
      stored,
    )
    expect(merged.cloudflare).toEqual({
      siteKey: 'cf-site',
      secretKey: 'cf-secret',
    })
  })
})
