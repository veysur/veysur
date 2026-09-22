import { assertJwtKeyIsConfigured } from './09-validate-jwt-config'

describe('assertJwtKeyIsConfigured', () => {
  it('throws when the key is empty', () => {
    expect(() => assertJwtKeyIsConfigured('')).toThrow(
      /missing or weak JWT signing key/,
    )
  })

  it('throws when the key is shorter than the minimum length', () => {
    expect(() => assertJwtKeyIsConfigured('too-short')).toThrow(
      /missing or weak JWT signing key/,
    )
  })

  it('does not throw for a key at least 32 characters long', () => {
    expect(() => assertJwtKeyIsConfigured('a'.repeat(32))).not.toThrow()
  })

  it('does not throw for a real generated secret', () => {
    const generatedSecret =
      'REDACTED-DEV-JWT-KEYREDACTED-DEV-JWT-KEY'
    expect(() => assertJwtKeyIsConfigured(generatedSecret)).not.toThrow()
  })
})
