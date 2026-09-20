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
      { name: 'extra_cookie', description: 'Set by an overlay.', duration: '1 day' },
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
})
