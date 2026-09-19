import { isValidCustomAttributeName } from './validateAttributeName'

describe('isValidCustomAttributeName', () => {
  it('accepts a valid identifier name', () => {
    expect(isValidCustomAttributeName('department')).toEqual({ valid: true })
  })

  it('accepts names with underscores and digits', () => {
    expect(isValidCustomAttributeName('_myAttribute1')).toEqual({
      valid: true,
    })
  })

  it('rejects names containing a dollar sign', () => {
    const result = isValidCustomAttributeName('my$Attribute')
    expect(result.valid).toBe(false)
  })

  it('rejects names that do not match the identifier pattern', () => {
    const result = isValidCustomAttributeName('123invalid')
    expect(result.valid).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it('rejects names containing invalid characters', () => {
    const result = isValidCustomAttributeName('my-attribute')
    expect(result.valid).toBe(false)
  })

  it('rejects names that are too long', () => {
    const result = isValidCustomAttributeName('a'.repeat(65))
    expect(result.valid).toBe(false)
  })

  it('rejects names that collide with system attributes', () => {
    const result = isValidCustomAttributeName('nameFirst')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/system attribute/)
  })

  it('rejects names that collide with JS-reserved property names', () => {
    const result = isValidCustomAttributeName('constructor')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/reserved/)
  })

  it('rejects __proto__', () => {
    const result = isValidCustomAttributeName('__proto__')
    expect(result.valid).toBe(false)
  })
})
