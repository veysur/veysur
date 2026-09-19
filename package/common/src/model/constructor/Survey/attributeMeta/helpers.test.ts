import { validateMaxNotLessThanMin } from './helpers'

describe('validateMaxNotLessThanMin', () => {
  const validate = validateMaxNotLessThanMin('Number Min/Max')

  test('accepts when max is greater than min (unwrapped root)', () => {
    expect(validate(10, { root: { min: 5, max: 10 } })).toBe(true)
  })

  test('rejects when max is less than min (unwrapped root)', () => {
    expect(validate(3, { root: { min: 5, max: 3 } })).toBe(
      'Min cannot be greater than Max',
    )
  })

  test('rejects when max is less than min (wrapped root, as AttributeCard produces)', () => {
    expect(
      validate(3, { root: { 'Number Min/Max': { min: 5, max: 3 } } }),
    ).toBe('Min cannot be greater than Max')
  })

  test('accepts when max equals min', () => {
    expect(validate(5, { root: { min: 5, max: 5 } })).toBe(true)
  })

  test('treats max of 0 as no limit', () => {
    expect(validate(0, { root: { min: 5, max: 0 } })).toBe(true)
  })

  test('treats min of 0 as no limit', () => {
    expect(validate(1, { root: { min: 0, max: 1 } })).toBe(true)
  })

  test('accepts when min is undefined', () => {
    expect(validate(3, { root: {} })).toBe(true)
  })

  test('accepts when options is undefined', () => {
    expect(validate(3, undefined)).toBe(true)
  })
})
