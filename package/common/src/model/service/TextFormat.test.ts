import {
  isSafeRegexPattern,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validateTextFormat,
} from './TextFormat'

describe('TextFormat', () => {
  describe('isValidEmail', () => {
    test.each(['jane@example.com', 'a.b+c@sub.example.co.uk'])('%s', (v) =>
      expect(isValidEmail(v)).toBe(true),
    )
    test('rejects empty domain labels without backtracking', () => {
      expect(isValidEmail('a@b..c')).toBe(false)
      expect(isValidEmail('a@' + '!.'.repeat(50000))).toBe(false)
    })
    test.each(['not-an-email', 'missing@domain', 'a b@example.com'])(
      '%s is rejected',
      (v) => expect(isValidEmail(v)).toBe(false),
    )
  })

  describe('isValidUrl', () => {
    test('accepts http and https', () => {
      expect(isValidUrl('https://example.com/a?b=1')).toBe(true)
      expect(isValidUrl('http://example.com')).toBe(true)
    })
    test('rejects other schemes and bare text', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    test('without countries requires an international number', () => {
      expect(isValidPhone('+44 7911 123456')).toBe(true)
      expect(isValidPhone('07911 123456')).toBe(false)
      expect(isValidPhone('+44 123')).toBe(false)
    })
    test('national format is read against a listed country', () => {
      expect(isValidPhone('07911 123456', 'GB')).toBe(true)
      expect(isValidPhone('(415) 555-2671', 'US')).toBe(true)
      expect(isValidPhone('(415) 555-2671', 'GB')).toBe(false)
    })
    test('any listed country may match', () => {
      expect(isValidPhone('(415) 555-2671', 'GB, us')).toBe(true)
    })
    test('international numbers must belong to a listed country', () => {
      expect(isValidPhone('+1 415 555 2671', 'GB')).toBe(false)
      expect(isValidPhone('+44 7911 123456', 'GB')).toBe(true)
    })
  })

  describe('edge cases', () => {
    test('an unknown country code in the list does not throw or match', () => {
      expect(isValidPhone('07911 123456', 'XX')).toBe(false)
      expect(isValidPhone('07911 123456', 'XX,GB')).toBe(true)
    })
    test('surrounding whitespace is ignored for built-in formats', () => {
      expect(validateTextFormat('  a@b.co  ', { format: 'email' })).toBe(true)
      expect(validateTextFormat(' +44 7911 123456 ', { format: 'phone' })).toBe(
        true,
      )
      expect(
        validateTextFormat(' https://example.com ', { format: 'url' }),
      ).toBe(true)
    })
  })

  describe('isSafeRegexPattern', () => {
    test('accepts ordinary patterns', () => {
      expect(isSafeRegexPattern('^[A-Z]{2}\\d{4}$')).toBe(true)
    })
    test('rejects invalid, empty, over-long and nested-repetition patterns', () => {
      expect(isSafeRegexPattern('(')).toBe(false)
      expect(isSafeRegexPattern('')).toBe(false)
      expect(isSafeRegexPattern('a'.repeat(201))).toBe(false)
      expect(isSafeRegexPattern('(a+)+$')).toBe(false)
    })
  })

  describe('validateTextFormat', () => {
    test('empty and non-string values pass for every format', () => {
      for (const format of ['email', 'phone', 'url', 'custom']) {
        expect(validateTextFormat('', { format, pattern: '^x$' })).toBe(true)
        expect(validateTextFormat('  ', { format })).toBe(true)
        expect(validateTextFormat(undefined, { format })).toBe(true)
      }
    })
    test('none and unknown formats pass anything', () => {
      expect(validateTextFormat('anything', { format: 'none' })).toBe(true)
      expect(validateTextFormat('anything', {})).toBe(true)
    })
    test('custom matches the pattern', () => {
      const config = { format: 'custom', pattern: '^[A-Z]{2}\\d{4}$' }
      expect(validateTextFormat('AB1234', config)).toBe(true)
      expect(validateTextFormat('ab1234', config)).toBe(false)
    })
    test('custom must match the whole answer, with or without anchors', () => {
      expect(
        validateTextFormat('1234', { format: 'custom', pattern: '\\d{4}' }),
      ).toBe(true)
      expect(
        validateTextFormat('ab1234', { format: 'custom', pattern: '\\d{4}' }),
      ).toBe(false)
      expect(
        validateTextFormat('ab', { format: 'custom', pattern: 'a|b' }),
      ).toBe(false)
      expect(
        validateTextFormat('b', { format: 'custom', pattern: 'a|b' }),
      ).toBe(true)
    })
    test('custom skips an unsafe or missing pattern', () => {
      expect(
        validateTextFormat('x', { format: 'custom', pattern: '(a+)+$' }),
      ).toBe(true)
      expect(validateTextFormat('x', { format: 'custom' })).toBe(true)
    })
    test('custom fails an over-long answer without running the pattern', () => {
      const config = { format: 'custom', pattern: '^a*$' }
      expect(validateTextFormat('a'.repeat(1001), config)).toBe(false)
    })
  })
})
