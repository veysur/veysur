import { shortenDocumentCode } from './formatDocumentCode'

describe('shortenDocumentCode', () => {
  test('strips the CUS-<userId>- prefix from an invoice number', () => {
    expect(shortenDocumentCode('CUS-eV3yE36sVY8VHbD-INV-0000001')).toBe(
      'INV-0000001',
    )
  })

  test('strips the CUS-<userId>- prefix from a credit note number', () => {
    expect(shortenDocumentCode('CUS-eV3yE36sVY8VHbD-CN-0000001')).toBe(
      'CN-0000001',
    )
  })

  test('handles a userId that itself contains hyphens', () => {
    expect(shortenDocumentCode('CUS-abc-def-ghi-INV-0000042')).toBe(
      'INV-0000042',
    )
  })

  test('returns an empty string for null or undefined', () => {
    expect(shortenDocumentCode(null)).toBe('')
    expect(shortenDocumentCode(undefined)).toBe('')
  })

  test('falls back to the raw string when the pattern does not match', () => {
    expect(shortenDocumentCode('SOME-OTHER-CODE')).toBe('SOME-OTHER-CODE')
  })
})
