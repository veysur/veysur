import { resolveBotProtection } from './BotProtectionConfig'

const keys = { siteKey: ' site ', secretKey: 'secret' }

describe('resolveBotProtection', () => {
  test('is none when the survey does not ask for it', () => {
    expect(resolveBotProtection({ provider: 'simple' }, false).provider).toBe(
      'none',
    )
    expect(resolveBotProtection({ provider: 'simple' }, null).provider).toBe(
      'none',
    )
  })

  test('is none with no setting or an unknown provider', () => {
    expect(resolveBotProtection(undefined, true).provider).toBe('none')
    expect(resolveBotProtection({ provider: 'other' }, true).provider).toBe(
      'none',
    )
  })

  test('simple needs no keys', () => {
    expect(resolveBotProtection({ provider: 'simple' }, true)).toEqual({
      provider: 'simple',
      siteKey: '',
    })
  })

  test.each(['cloudflare', 'google'] as const)(
    '%s resolves with both keys and trims the site key',
    (provider) => {
      expect(
        resolveBotProtection({ provider, [provider]: keys }, true),
      ).toEqual({ provider, siteKey: 'site' })
    },
  )

  test.each(['cloudflare', 'google'] as const)(
    '%s with a missing key degrades to none',
    (provider) => {
      expect(
        resolveBotProtection(
          { provider, [provider]: { siteKey: 'site', secretKey: '' } },
          true,
        ).provider,
      ).toBe('none')
      expect(
        resolveBotProtection(
          { provider, [provider]: { siteKey: null, secretKey: 'secret' } },
          true,
        ).provider,
      ).toBe('none')
      expect(resolveBotProtection({ provider }, true).provider).toBe('none')
    },
  )

  test('never exposes the secret key', () => {
    const resolved = resolveBotProtection(
      { provider: 'google', google: keys },
      true,
    )
    expect(JSON.stringify(resolved)).not.toContain('secret')
  })
})
