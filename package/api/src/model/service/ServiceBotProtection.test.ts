import { createHash } from 'crypto'

import { asPrivate } from 'test-utils/asPrivate'

import { ServiceBotProtection } from './ServiceBotProtection'

type ServicePrivateOverrides = {
  modelManager: unknown
  config: unknown
}

describe('ServiceBotProtection', () => {
  let service: ServiceBotProtection

  beforeEach(() => {
    service = new ServiceBotProtection()
    const overrides = asPrivate<ServiceBotProtection, ServicePrivateOverrides>(
      service,
    )
    overrides.modelManager = { dataSources: {} }
    overrides.config = {
      model: {
        app: {
          jwt: { key: 'test-key' },
          botProtection: {
            powBits: 4,
            minSeconds: 0,
            recaptchaMinScore: 0.5,
            accountCheckEnabled: true,
          },
        },
      },
    }
  })

  const simple = { provider: 'simple' }

  test('rejects a honeypot value whatever the token says', async () => {
    const { challenge } = service.issueChallenge('s1')
    expect(
      await service.verify({
        setting: simple,
        surveyId: 's1',
        token: `${challenge}:0`,
        honeypot: 'http://spam.example',
      }),
    ).toBe(false)
  })

  test('rejects when the project has no usable provider', async () => {
    expect(
      await service.verify({
        setting: { provider: 'none' },
        surveyId: 's1',
        token: 'x:1',
      }),
    ).toBe(false)
    expect(
      await service.verify({
        setting: {
          provider: 'google',
          google: { siteKey: 'a', secretKey: '' },
        },
        surveyId: 's1',
        token: 'x',
      }),
    ).toBe(false)
  })

  test('verifies a simple solution through the registry', async () => {
    const { challenge, bits } = service.issueChallenge('s1')
    let token = ''
    for (let nonce = 0; !token; nonce++) {
      const digest = (await import('crypto'))
        .createHash('sha256')
        .update(`${challenge}:${nonce}`)
        .digest()
      if (digest[0] >> (8 - bits) === 0) token = `${challenge}:${nonce}`
    }
    expect(
      await service.verify({ setting: simple, surveyId: 's1', token }),
    ).toBe(true)
    expect(
      await service.verify({ setting: simple, surveyId: 's1', token }),
    ).toBe(false)
  })

  describe('account check', () => {
    const solveAccount = () => {
      const { challenge, bits } = service.issueAccountChallenge()
      for (let nonce = 0; ; nonce++) {
        const digest = createHash('sha256')
          .update(`${challenge}:${nonce}`)
          .digest()
        if (digest[0] >> (8 - bits) === 0) return `${challenge}:${nonce}`
      }
    }

    const setEnabled = (accountCheckEnabled: boolean) => {
      const { config } = asPrivate<
        ServiceBotProtection,
        { config: { model: { app: { botProtection: object } } } }
      >(service)
      Object.assign(config.model.app.botProtection, { accountCheckEnabled })
    }

    test('accepts a valid solution once', async () => {
      const token = solveAccount()
      await expect(
        service.assertAccountBotCheck({ token }),
      ).resolves.toBeUndefined()
      await expect(service.assertAccountBotCheck({ token })).rejects.toThrow()
    })

    test.each([
      ['no check', undefined],
      ['an empty token', { token: '' }],
      ['a malformed token', { token: 'nope' }],
    ])('rejects %s', async (_label, botCheck) => {
      await expect(service.assertAccountBotCheck(botCheck)).rejects.toThrow()
    })

    test('rejects a filled honeypot', async () => {
      await expect(
        service.assertAccountBotCheck({
          token: solveAccount(),
          honeypot: 'spam',
        }),
      ).rejects.toThrow()
    })

    test('does not accept a survey challenge', async () => {
      const { challenge, bits } = service.issueChallenge('s1')
      let token = ''
      for (let nonce = 0; !token; nonce++) {
        const digest = createHash('sha256')
          .update(`${challenge}:${nonce}`)
          .digest()
        if (digest[0] >> (8 - bits) === 0) token = `${challenge}:${nonce}`
      }
      await expect(service.assertAccountBotCheck({ token })).rejects.toThrow()
    })

    test('skips the check and issues no challenge when disabled', async () => {
      setEnabled(false)
      expect(service.issueAccountChallenge()).toEqual({ enabled: false })
      await expect(
        service.assertAccountBotCheck(undefined),
      ).resolves.toBeUndefined()
    })

    test('issues a challenge when enabled', () => {
      expect(service.issueAccountChallenge()).toMatchObject({
        enabled: true,
        bits: 4,
      })
    })
  })

  describe('effectiveSetting', () => {
    const project = {
      provider: 'cloudflare',
      cloudflare: { siteKey: 'p-site', secretKey: 'p-secret' },
      google: { siteKey: 'pg-site', secretKey: 'pg-secret' },
    }

    test('uses the project values when the survey overrides nothing', () => {
      expect(service.effectiveSetting({ survey: null, project })).toEqual(
        project,
      )
    })

    test('overrides each field on its own', () => {
      const setting = service.effectiveSetting({
        survey: {
          provider: 'google',
          cloudflare: { siteKey: null, secretKey: null },
          google: { siteKey: 's-site', secretKey: null },
        },
        project,
      })
      expect(setting.provider).toBe('google')
      expect(setting.google).toEqual({
        siteKey: 's-site',
        secretKey: 'pg-secret',
      })
    })

    test('a survey provider of none turns the check off', () => {
      const setting = service.effectiveSetting({
        survey: { provider: 'none' },
        project,
      })
      expect(service.resolve(setting, true).provider).toBe('none')
    })
  })
})
