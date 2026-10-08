import { getEmbedAncestorOrigin } from './embedAncestorOrigin'

describe('getEmbedAncestorOrigin', () => {
  test('prefers the parent ancestor origin', () => {
    expect(
      getEmbedAncestorOrigin(
        ['https://host.example'],
        'https://other.example/x',
      ),
    ).toBe('https://host.example')
  })

  test('falls back to the referrer origin', () => {
    expect(
      getEmbedAncestorOrigin(undefined, 'https://host.example/page?q=1'),
    ).toBe('https://host.example')
  })

  test('ignores an opaque "null" ancestor', () => {
    expect(getEmbedAncestorOrigin(['null'], 'https://host.example/p')).toBe(
      'https://host.example',
    )
  })

  test('reports unknown when nothing can be detected', () => {
    expect(getEmbedAncestorOrigin(undefined, '')).toBe('unknown')
    expect(getEmbedAncestorOrigin([], 'not a url')).toBe('unknown')
  })
})
