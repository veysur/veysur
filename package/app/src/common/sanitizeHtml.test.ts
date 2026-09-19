import { sanitizeHtml } from './sanitizeHtml'

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>')
  })

  it('strips event handler attributes', () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe(
      '<img src="x">',
    )
  })

  it('keeps basic formatting tags', () => {
    expect(sanitizeHtml('<strong>bold</strong> <em>italic</em>')).toBe(
      '<strong>bold</strong> <em>italic</em>',
    )
  })

  it('returns an empty string for null or undefined input', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })
})
