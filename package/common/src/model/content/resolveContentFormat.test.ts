import { resolveContentFormat } from './resolveContentFormat'

describe('resolveContentFormat', () => {
  test('markdownAllowed true, htmlAllowed true -> markdown', () => {
    expect(
      resolveContentFormat({ htmlAllowed: true, markdownAllowed: true }),
    ).toBe('markdown')
  })

  test('markdownAllowed true, htmlAllowed false -> markdown', () => {
    expect(
      resolveContentFormat({ htmlAllowed: false, markdownAllowed: true }),
    ).toBe('markdown')
  })

  test('markdownAllowed false, htmlAllowed true -> html', () => {
    expect(
      resolveContentFormat({ htmlAllowed: true, markdownAllowed: false }),
    ).toBe('html')
  })

  test('markdownAllowed false, htmlAllowed false -> plain', () => {
    expect(
      resolveContentFormat({ htmlAllowed: false, markdownAllowed: false }),
    ).toBe('plain')
  })
})
