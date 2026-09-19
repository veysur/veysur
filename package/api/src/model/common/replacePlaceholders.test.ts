import { replacePlaceholders } from './replacePlaceholders'

describe('replacePlaceholders', () => {
  test('replaces {{var}} placeholders with matching data values', () => {
    const result = replacePlaceholders('Hello {{name}}, welcome to {{place}}', {
      name: 'Jane',
      place: 'VeySur',
    })
    expect(result).toBe('Hello Jane, welcome to VeySur')
  })

  test('leaves unmatched placeholders untouched', () => {
    const result = replacePlaceholders('Hello {{name}}', {})
    expect(result).toBe('Hello {{name}}')
  })

  test('returns the template unchanged when falsy', () => {
    expect(replacePlaceholders('', { name: 'Jane' })).toBe('')
    expect(replacePlaceholders(undefined as unknown as string, {})).toBe(
      undefined,
    )
  })

  test('stringifies non-string data values', () => {
    const result = replacePlaceholders('Count: {{count}}', { count: 5 })
    expect(result).toBe('Count: 5')
  })

  test('HTML-escapes resolved values (deliberate behaviour change)', () => {
    const result = replacePlaceholders('Hi {{name}}', {
      name: '<script>alert(1)</script>',
    })
    expect(result).toBe('Hi &lt;script&gt;alert(1)&lt;/script&gt;')
  })

  test('stringifies a null/undefined value directly rather than leaking an internal token', () => {
    expect(replacePlaceholders('Value: {{x}}', { x: null })).toBe('Value: null')
    expect(replacePlaceholders('Value: {{x}}', { x: undefined })).toBe(
      'Value: undefined',
    )
  })
})
