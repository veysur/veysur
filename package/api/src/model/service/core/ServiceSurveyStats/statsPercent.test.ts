import { percentOf } from './statsPercent'

describe('percentOf', () => {
  it('returns the ratio as a percentage rounded to one decimal place', () => {
    expect(percentOf(1, 3)).toBe(33.3)
    expect(percentOf(2, 3)).toBe(66.7)
    expect(percentOf(1, 8)).toBe(12.5)
    expect(percentOf(3, 3)).toBe(100)
  })

  it('returns 0 when the denominator is 0 or negative', () => {
    expect(percentOf(0, 0)).toBe(0)
    expect(percentOf(5, 0)).toBe(0)
    expect(percentOf(1, -2)).toBe(0)
  })
})
