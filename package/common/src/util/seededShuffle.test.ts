import { mulberry32, shuffleWithSeed } from './seededShuffle'

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const rand = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic — same seed produces same sequence', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const aValues = Array.from({ length: 10 }, () => a())
    const bValues = Array.from({ length: 10 }, () => b())
    expect(aValues).not.toEqual(bValues)
  })
})

describe('shuffleWithSeed', () => {
  const items = ['a', 'b', 'c', 'd', 'e']

  it('returns a new array — does not mutate the original', () => {
    const original = [...items]
    const result = shuffleWithSeed(items, 99)
    expect(items).toEqual(original)
    expect(result).not.toBe(items)
  })

  it('returns all items (no duplicates, no omissions)', () => {
    const result = shuffleWithSeed(items, 42)
    expect(result.sort()).toEqual([...items].sort())
  })

  it('is deterministic — same seed always produces the same order', () => {
    const a = shuffleWithSeed(items, 12345)
    const b = shuffleWithSeed(items, 12345)
    expect(a).toEqual(b)
  })

  it('produces different orders for different seeds', () => {
    // With 5 items there are 120 permutations; seeds 1 and 2 should differ
    const a = shuffleWithSeed(items, 1)
    const b = shuffleWithSeed(items, 2)
    expect(a).not.toEqual(b)
  })

  it('handles an empty array', () => {
    expect(shuffleWithSeed([], 42)).toEqual([])
  })

  it('handles a single-element array', () => {
    expect(shuffleWithSeed([42], 99)).toEqual([42])
  })
})
