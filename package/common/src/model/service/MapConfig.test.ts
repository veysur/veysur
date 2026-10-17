import { resolveMapConfig, resolveQuestionMapProvider } from './MapConfig'

describe('resolveMapConfig', () => {
  test('defaults to OSM with no key', () => {
    expect(resolveMapConfig({})).toEqual({ provider: 'osm', googleApiKey: '' })
  })

  test('uses the deployment key and provider', () => {
    expect(
      resolveMapConfig({ providerDefault: 'google', googleApiKey: 'dep' }),
    ).toEqual({ provider: 'google', googleApiKey: 'dep' })
  })

  test('the project key wins over the deployment key', () => {
    expect(
      resolveMapConfig({ googleApiKey: 'dep' }, ' proj ').googleApiKey,
    ).toBe('proj')
  })

  test('a blank project key falls back to the deployment key', () => {
    expect(resolveMapConfig({ googleApiKey: 'dep' }, '  ').googleApiKey).toBe(
      'dep',
    )
  })

  test('a Google default without any key degrades to OSM', () => {
    expect(resolveMapConfig({ providerDefault: 'google' }).provider).toBe('osm')
  })

  test('an unknown default degrades to OSM', () => {
    expect(
      resolveMapConfig({ providerDefault: 'bing', googleApiKey: 'k' }).provider,
    ).toBe('osm')
  })
})

describe('resolveQuestionMapProvider', () => {
  const withKey = { provider: 'osm', googleApiKey: 'k' } as const
  const noKey = { provider: 'osm', googleApiKey: '' } as const

  test('"default" and unset follow the configured provider', () => {
    expect(resolveQuestionMapProvider('default', withKey)).toBe('osm')
    expect(resolveQuestionMapProvider(undefined, withKey)).toBe('osm')
    expect(
      resolveQuestionMapProvider('default', {
        provider: 'google',
        googleApiKey: 'k',
      }),
    ).toBe('google')
  })

  test('a question may choose Google when a key exists', () => {
    expect(resolveQuestionMapProvider('google', withKey)).toBe('google')
  })

  test('a question asking for Google without a key falls back to OSM', () => {
    expect(resolveQuestionMapProvider('google', noKey)).toBe('osm')
  })

  test('a question may choose OSM over a Google default', () => {
    expect(
      resolveQuestionMapProvider('osm', {
        provider: 'google',
        googleApiKey: 'k',
      }),
    ).toBe('osm')
  })
})
