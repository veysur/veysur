import { isEmbedOriginAllowed, parseEmbedDomains } from './embedOrigin'

describe('isEmbedOriginAllowed', () => {
  test('allows any origin when no domains are listed', () => {
    expect(isEmbedOriginAllowed('https://anywhere.example', [])).toBe(true)
    expect(isEmbedOriginAllowed('https://anywhere.example', null)).toBe(true)
  })

  test('matches the exact hostname, ignoring scheme, port and case', () => {
    expect(
      isEmbedOriginAllowed('https://Example.com:8443', ['example.com']),
    ).toBe(true)
  })

  test('matches subdomains of a listed domain', () => {
    expect(
      isEmbedOriginAllowed('https://blog.example.com', ['example.com']),
    ).toBe(true)
  })

  test('does not match a different domain that merely ends with the listed text', () => {
    expect(
      isEmbedOriginAllowed('https://badexample.com', ['example.com']),
    ).toBe(false)
  })

  test('rejects an origin that is not a valid URL', () => {
    expect(isEmbedOriginAllowed('not a url', ['example.com'])).toBe(false)
  })

  test('ignores blank entries', () => {
    expect(isEmbedOriginAllowed('https://example.com', ['  '])).toBe(false)
  })
})

describe('parseEmbedDomains', () => {
  test('splits on newlines, commas and spaces', () => {
    expect(parseEmbedDomains('a.com\nb.com, c.com d.com')).toEqual([
      'a.com',
      'b.com',
      'c.com',
      'd.com',
    ])
  })

  test('reduces URLs to hostnames, lower-cases and removes duplicates', () => {
    expect(
      parseEmbedDomains(
        'https://WWW.Example.com/page?x=1\nexample.com:8080\nwww.example.com',
      ),
    ).toEqual(['www.example.com', 'example.com'])
  })

  test('drops * because an empty list is how any website is allowed', () => {
    expect(parseEmbedDomains('*\nExample.com')).toEqual(['example.com'])
  })

  test('drops blanks and entries that are not hostnames', () => {
    expect(parseEmbedDomains('  \n,, http://')).toEqual([])
  })
})
