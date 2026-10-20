import { cookieCatalog, mergeExtraCookies } from './cookieCatalog'

describe('cookieCatalog', () => {
  it('lists only the necessary cookies core itself sets', () => {
    const necessary = cookieCatalog.find((c) => c.id === 'necessary')

    expect(necessary?.cookies.map((cookie) => cookie.name)).toEqual([
      'veysur-theme',
      'sidebar_state',
    ])
  })
})

describe('mergeExtraCookies', () => {
  const extra = {
    necessary: [
      { name: 'extra_cookie', description: 'Set by an extension.', duration: '1 day' },
    ],
  }

  it('appends extra cookies to the matching category, after core cookies', () => {
    const merged = mergeExtraCookies(cookieCatalog, extra)
    const necessary = merged.find((c) => c.id === 'necessary')
    const coreNecessary = cookieCatalog.find((c) => c.id === 'necessary')

    expect(necessary?.cookies).toEqual([
      ...(coreNecessary?.cookies ?? []),
      extra.necessary[0],
    ])
  })

  it('leaves categories with no extra cookies unchanged', () => {
    const merged = mergeExtraCookies(cookieCatalog, extra)

    expect(merged.find((c) => c.id === 'analytics')).toEqual(
      cookieCatalog.find((c) => c.id === 'analytics'),
    )
  })

  it('returns the catalogue unchanged when there are no extra cookies', () => {
    expect(mergeExtraCookies(cookieCatalog, {})).toEqual(cookieCatalog)
  })

  it('does not mutate the core catalogue', () => {
    const before = JSON.stringify(cookieCatalog)

    mergeExtraCookies(cookieCatalog, extra)

    expect(JSON.stringify(cookieCatalog)).toBe(before)
  })

  it('adds a marketing category only when marketing cookies are supplied', () => {
    const marketing = [
      { name: 'ad_cookie', description: 'Measures ads.', duration: '90 days' },
    ]

    const merged = mergeExtraCookies(cookieCatalog, { marketing })

    expect(merged.map((c) => c.id)).toEqual([
      ...cookieCatalog.map((c) => c.id),
      'marketing',
    ])
    expect(merged.find((c) => c.id === 'marketing')?.cookies).toEqual(marketing)
    expect(
      mergeExtraCookies(cookieCatalog, { marketing: [] }).map((c) => c.id),
    ).toEqual(cookieCatalog.map((c) => c.id))
  })
})
