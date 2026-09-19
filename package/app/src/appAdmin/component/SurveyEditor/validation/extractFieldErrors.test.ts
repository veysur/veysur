import { extractFieldErrors } from './extractFieldErrors'

describe('extractFieldErrors', () => {
  it('returns errors matched directly at the path', () => {
    const errors = { 'title.eng': ['msg1', 'msg2'] }
    expect(extractFieldErrors(errors, 'title.eng')).toEqual(['msg1', 'msg2'])
  })

  it('deduplicates errors matched directly at the path', () => {
    const errors = { 'title.eng': ['msg1', 'msg1'] }
    expect(extractFieldErrors(errors, 'title.eng')).toEqual(['msg1'])
  })

  it('collects errors from prefixed paths when there is no direct array match', () => {
    const errors = { 'title.eng': ['nested1'], 'title.deu': ['nested2'] }
    expect(extractFieldErrors(errors, 'title')).toEqual(['nested1', 'nested2'])
  })

  it('deduplicates errors collected across multiple matching nested paths', () => {
    const errors = { 'a.b': ['dup'], 'a.c': ['dup'] }
    expect(extractFieldErrors(errors, 'a')).toEqual(['dup'])
  })

  it('falls back to flattening every error when nothing matches the path', () => {
    const errors = { foo: ['a'], bar: ['b'] }
    expect(new Set(extractFieldErrors(errors, 'nonexistent'))).toEqual(
      new Set(['a', 'b']),
    )
  })

  it('returns a generic message when errors is undefined', () => {
    expect(extractFieldErrors(undefined, 'title.eng')).toEqual([
      'Validation failed',
    ])
  })

  it('returns no messages when errors is an empty object', () => {
    expect(extractFieldErrors({}, 'title.eng')).toEqual([])
  })
})
