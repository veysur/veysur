import { compileRule } from './07-rate-limit'

describe('compileRule', () => {
  test('throws when a non-skipped rule is missing limit and windowSeconds', () => {
    expect(() =>
      compileRule({ pattern: '^/api/auth', tierKey: 'auth' }, 0),
    ).toThrow(/must define both limit and windowSeconds/)
  })

  test('throws when a non-skipped rule is missing only windowSeconds', () => {
    expect(() =>
      compileRule({ pattern: '^/api/auth', tierKey: 'auth', limit: 10 }, 0),
    ).toThrow(/must define both limit and windowSeconds/)
  })

  test('does not throw when skip is true and limit/windowSeconds are missing', () => {
    expect(() =>
      compileRule({ pattern: '^/api/ping', skip: true }, 0),
    ).not.toThrow()
  })

  test('compiles a valid non-skipped rule without throwing', () => {
    const compiled = compileRule(
      { pattern: '^/api/auth', tierKey: 'auth', limit: 10, windowSeconds: 60 },
      0,
    )
    expect(compiled.skip).toBe(false)
    expect(compiled.tierKey).toBe('auth')
    expect(compiled.limit).toBe(10)
    expect(compiled.limiter).toBeDefined()
  })

  test('defaults tierKey to r{index} when omitted', () => {
    const compiled = compileRule({ pattern: '^/api/ping', skip: true }, 3)
    expect(compiled.tierKey).toBe('r3')
  })
})
