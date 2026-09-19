import { Logger } from './Logger'

const R = '█'

describe('Logger', () => {
  describe('DEFAULT_REDACT_PATTERNS', () => {
    it('includes expected sensitive field patterns', () => {
      const patterns = Logger.DEFAULT_REDACT_PATTERNS
      expect(
        patterns.some(
          (p) => p instanceof RegExp && /password/i.test('password'),
        ),
      ).toBe(true)
      expect(
        patterns.some((p) => p instanceof RegExp && /token/i.test('token')),
      ).toBe(true)
      expect(
        patterns.some((p) => p instanceof RegExp && /email/i.test('email')),
      ).toBe(true)
    })
  })

  describe('redactString', () => {
    it('fully redacts strings of 4 chars or fewer', () => {
      expect(Logger.redactString('abcd')).toBe(R.repeat(4))
      expect(Logger.redactString('ab')).toBe(R.repeat(2))
    })

    it('keeps first char for strings 5 to 12 chars', () => {
      const result = Logger.redactString('abcdefgh') // 8 chars
      expect(result[0]).toBe('a')
      expect(result.slice(1)).toBe(R.repeat(7))
    })

    it('keeps first 2 chars for strings 13 to 24 chars', () => {
      const value = 'abcdefghijklmno' // 15 chars
      const result = Logger.redactString(value)
      expect(result.slice(0, 2)).toBe('ab')
      expect(result.slice(2)).toBe(R.repeat(13))
    })

    it('keeps first 2 and near-last 2 chars for strings 25 to 32 chars', () => {
      // substr(length - 1 - 2, 2) reveals chars at index 23-24
      const value = 'abcdefghijklmnopqrstuvwxyz' // 26 chars, index 23-24 = 'xy'
      const result = Logger.redactString(value)
      expect(result.slice(0, 2)).toBe('ab')
      expect(result.slice(2, 10)).toBe(R.repeat(8))
      expect(result.slice(10)).toBe('xy')
    })

    it('keeps first 4 and near-last 4 chars for strings 33 to 64 chars', () => {
      const value = 'a'.repeat(40)
      const result = Logger.redactString(value)
      expect(result.slice(0, 4)).toBe('aaaa')
      expect(result.slice(4, 12)).toBe(R.repeat(8))
      expect(result.slice(12)).toBe('aaaa')
    })

    it('keeps first 8 and near-last 8 chars for strings over 64 chars', () => {
      // substr(length - 1 - 8, 8) for length=76: index 67-74 = 'xEEEEEEE'
      const value = 'S'.repeat(8) + 'x'.repeat(60) + 'E'.repeat(8) // 76 chars
      const result = Logger.redactString(value)
      expect(result.slice(0, 8)).toBe('S'.repeat(8))
      expect(result.slice(8, 16)).toBe(R.repeat(8))
      expect(result.slice(16)).toBe('xEEEEEEE')
    })
  })

  describe('redactFieldValue', () => {
    const patterns = Logger.DEFAULT_REDACT_PATTERNS

    it('redacts a field matched by regex pattern', () => {
      expect(Logger.redactFieldValue('secret', 'password', patterns)).toContain(
        R,
      )
    })

    it('redacts a field matched case-insensitively', () => {
      expect(Logger.redactFieldValue('secret', 'PASSWORD', patterns)).toContain(
        R,
      )
    })

    it('redacts a field matched by exact string pattern', () => {
      expect(Logger.redactFieldValue('abc123', 'apiKey', ['apiKey'])).toContain(
        R,
      )
    })

    it('does not redact a non-sensitive field', () => {
      expect(Logger.redactFieldValue('hello', 'username', patterns)).toBe(
        'hello',
      )
    })

    it('does not redact when patterns list is empty', () => {
      expect(Logger.redactFieldValue('secret', 'password', [])).toBe('secret')
    })
  })

  describe('Logger.serialize (static)', () => {
    it('redacts sensitive string fields in an object using default patterns', () => {
      const result = Logger.serialize({
        email: 'foo@bar.com',
        name: 'Alice',
      }) as Record<string, unknown>
      expect(result.name).toBe('Alice')
      expect(result.email).toContain(R)
    })

    it('redacts sensitive fields with custom patterns', () => {
      const result = Logger.serialize({ apiKey: 'abc123', name: 'Alice' }, [
        /apiKey/i,
      ]) as Record<string, unknown>
      expect(result.name).toBe('Alice')
      expect(result.apiKey).toContain(R)
    })

    it('does not redact when patterns is empty array', () => {
      const result = Logger.serialize({ password: 'secret' }, []) as Record<
        string,
        unknown
      >
      expect(result.password).toBe('secret')
    })

    it('recursively redacts nested objects', () => {
      const result = Logger.serialize({ user: { token: 'tok123' } }) as {
        user: Record<string, unknown>
      }
      expect(result.user.token).toContain(R)
    })

    it('recursively redacts within arrays', () => {
      const result = Logger.serialize([
        { password: 'p@ss' },
        { name: 'Bob' },
      ]) as Record<string, unknown>[]
      expect(result[0].password).toContain(R)
      expect(result[1].name).toBe('Bob')
    })

    it('handles circular references without throwing', () => {
      const obj: Record<string, unknown> = { a: 1 }
      obj.self = obj
      expect(() => Logger.serialize(obj)).not.toThrow()
      const result = Logger.serialize(obj) as Record<string, unknown>
      expect(result.self).toBe('[Circular]')
    })

    it('serialises Error objects to a plain object', () => {
      const err = new Error('something went wrong')
      const result = Logger.serialize(err) as Record<string, unknown>
      expect(result.name).toBe('Error')
      expect(result.message).toBe('something went wrong')
      expect(result.stack).toBeDefined()
    })

    it('includes extra Error properties when present', () => {
      const err = new Error('oops') as Error & Record<string, unknown>
      err.code = 'E_FAIL'
      err.ref = 'ref-001'
      err.userMessage = 'Something went wrong'
      const result = Logger.serialize(err) as Record<string, unknown>
      expect(result.code).toBe('E_FAIL')
      expect(result.ref).toBe('ref-001')
      expect(result.userMessage).toBe('Something went wrong')
    })

    it('passes through null', () => {
      expect(Logger.serialize(null)).toBeNull()
    })

    it('passes through non-sensitive primitives', () => {
      expect(Logger.serialize(42)).toBe(42)
      expect(Logger.serialize(true)).toBe(true)
    })

    it('returns string representation for non-serialisable values', () => {
      const result = Logger.serialize(BigInt(1))
      expect(typeof result).toBe('string')
    })
  })

  describe('Logger instance', () => {
    it('constructs with default redact patterns', () => {
      const logger = new Logger()
      expect(logger.config.redact).toEqual(
        expect.arrayContaining(Logger.DEFAULT_REDACT_PATTERNS),
      )
    })

    it('merges custom redact patterns with defaults', () => {
      const custom = [/apiKey/i]
      const logger = new Logger({ config: { redact: custom }, logger: null })
      expect(logger.config.redact).toEqual(
        expect.arrayContaining([...Logger.DEFAULT_REDACT_PATTERNS, ...custom]),
      )
    })

    it('instance serialize redacts using instance config', () => {
      const logger = new Logger({
        config: { redact: [/apiKey/i] },
        logger: null,
      })
      const result = logger.serialize({
        apiKey: 'abc123',
        name: 'Alice',
      }) as Record<string, unknown>
      expect(result.apiKey).toContain(R)
      expect(result.name).toBe('Alice')
    })

    it('logs by calling the underlying logger', () => {
      const mockLogger = {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      }
      const logger = new Logger({ config: { redact: [] }, logger: mockLogger })
      logger.log('test')
      expect(mockLogger.log).toHaveBeenCalledWith('test')
    })

    it('redacts sensitive data before passing to underlying logger', () => {
      const mockLogger = {
        info: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      }
      const logger = new Logger({ config: { redact: [] }, logger: mockLogger })
      logger.info({ password: 'secret123' })
      const logged = mockLogger.info.mock.calls[0][0]
      expect(logged.password).toContain(R)
    })
  })
})
