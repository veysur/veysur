import { SettingProject } from './SettingProject'

describe('SettingProject', () => {
  it('defaults to no provider, empty keys and an empty maps key', () => {
    const setting = new SettingProject({ _id: '1' })

    expect(setting.botProtection.provider).toBe('none')
    expect(setting.botProtection.cloudflare).toEqual({
      siteKey: '',
      secretKey: '',
    })
    expect(setting.botProtection.google).toEqual({ siteKey: '', secretKey: '' })
    expect(setting.maps).toEqual({ googleApiKey: '' })
  })

  it('keeps defaults for fields a validated document returns as null', () => {
    const setting = new SettingProject({
      _id: '1',
      maps: { googleApiKey: null, provider: null },
      botProtection: {
        provider: null,
        cloudflare: { siteKey: 'site', secretKey: null },
        google: null,
      },
    })

    expect(setting.maps).toEqual({ googleApiKey: '' })
    expect(setting.botProtection.provider).toBe('none')
    expect(setting.botProtection.cloudflare).toEqual({
      siteKey: 'site',
      secretKey: '',
    })
    expect(setting.botProtection.google).toEqual({ siteKey: '', secretKey: '' })
  })

  it('keeps stored values', () => {
    const setting = new SettingProject({
      _id: '1',
      maps: { googleApiKey: 'key', provider: 'google' },
      botProtection: { provider: 'google', google: { siteKey: 's' } },
    })

    expect(setting.maps).toEqual({ googleApiKey: 'key', provider: 'google' })
    expect(setting.botProtection.provider).toBe('google')
    expect(setting.botProtection.google.siteKey).toBe('s')
  })
})
