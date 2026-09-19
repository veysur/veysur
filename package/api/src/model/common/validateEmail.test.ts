import { isValidEmail, validateEmail } from './validateEmail'

describe('isValidEmail', () => {
  test('returns true for well-formed addresses', () => {
    expect(isValidEmail('jane@example.com')).toBe(true)
  })

  test('returns false for malformed addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
  })
})

describe('validateEmail', () => {
  test('does not throw for well-formed addresses', () => {
    expect(() => validateEmail('jane@example.com')).not.toThrow()
  })

  test('throws for malformed addresses', () => {
    expect(() => validateEmail('not-an-email')).toThrow('Invalid email format')
  })
})
