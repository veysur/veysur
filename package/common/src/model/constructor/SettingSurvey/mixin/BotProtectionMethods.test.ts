import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey BotProtection Methods', () => {
  test('defaults to no provider and empty keys', () => {
    const { botProtection } = new SettingSurvey({ _id: '1' })
    expect(botProtection.provider).toBe('none')
    expect(botProtection.cloudflare).toEqual({ siteKey: '', secretKey: '' })
    expect(botProtection.google).toEqual({ siteKey: '', secretKey: '' })
  })

  test('setBotProtectionProperty stores the provider on a new instance', () => {
    const setting = new SettingSurvey({ _id: '1' })
    const updated = setting.setBotProtectionProperty('provider', 'simple')

    expect(updated).not.toBe(setting)
    expect(updated.botProtection.provider).toBe('simple')
    expect(setting.botProtection.provider).toBe('none')
  })

  test('setBotProtectionProperty returns the same instance for an unchanged value', () => {
    const setting = new SettingSurvey({
      _id: '1',
      botProtection: { provider: 'simple' },
    })
    expect(setting.setBotProtectionProperty('provider', 'simple')).toBe(setting)
  })

  test('updateBotProtection merges updates and keeps other keys', () => {
    const setting = new SettingSurvey({
      _id: '1',
      botProtection: { provider: 'google' },
    }).updateBotProtection({
      cloudflare: { siteKey: 's', secretKey: 'k' },
    })
    expect(setting.botProtection.provider).toBe('google')
    expect(setting.botProtection.cloudflare.siteKey).toBe('s')
  })
})
