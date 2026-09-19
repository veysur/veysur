// cspell:ignore hrefs msgbox
import { sanitizeContent } from './sanitizeContent'

describe('sanitizeContent', () => {
  test('strips script tags by default', () => {
    const result = sanitizeContent('<p>hi</p><script>alert(1)</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('<p>hi</p>')
  })

  test('keeps script tags when scriptTagsAllowed is true', () => {
    const result = sanitizeContent('<script>alert(1)</script>', {
      scriptTagsAllowed: true,
    })
    expect(result).toContain('<script>')
  })

  test('strips javascript: scheme hrefs regardless of scriptTagsAllowed', () => {
    const withoutFlag = sanitizeContent('<a href="javascript:alert(1)">x</a>')
    const withFlag = sanitizeContent('<a href="javascript:alert(1)">x</a>', {
      scriptTagsAllowed: true,
    })
    expect(withoutFlag).not.toContain('javascript:')
    expect(withFlag).not.toContain('javascript:')
  })

  test('strips vbscript: scheme hrefs regardless of scriptTagsAllowed', () => {
    const result = sanitizeContent('<a href="vbscript:msgbox(1)">x</a>')
    expect(result).not.toContain('vbscript:')
  })

  test('strips onerror attributes (event handlers are never allowlisted)', () => {
    const result = sanitizeContent('<img src=x onerror="alert(1)">')
    expect(result).not.toContain('onerror')
  })

  test('allows http/https/mailto/tel schemes', () => {
    const result = sanitizeContent('<a href="https://example.com">x</a>')
    expect(result).toContain('https://example.com')
  })

  test('preserves basic formatting markup', () => {
    const result = sanitizeContent('<strong>bold</strong> <em>italic</em>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
  })
})
