import { isEqual } from './isEqual'

describe('isEqual', () => {
  describe('primitives', () => {
    it('should compare numbers', () => {
      expect(isEqual(1, 1)).toBe(true)
      expect(isEqual(1, 2)).toBe(false)
      expect(isEqual(0, 0)).toBe(true)
      expect(isEqual(-1, -1)).toBe(true)
      expect(isEqual(1.5, 1.5)).toBe(true)
    })

    it('should handle NaN', () => {
      expect(isEqual(NaN, NaN)).toBe(true)
      expect(isEqual(NaN, 1)).toBe(false)
    })

    it('should compare strings', () => {
      expect(isEqual('hello', 'hello')).toBe(true)
      expect(isEqual('hello', 'world')).toBe(false)
      expect(isEqual('', '')).toBe(true)
    })

    it('should compare booleans', () => {
      expect(isEqual(true, true)).toBe(true)
      expect(isEqual(false, false)).toBe(true)
      expect(isEqual(true, false)).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(isEqual(null, null)).toBe(true)
      expect(isEqual(undefined, undefined)).toBe(true)
      expect(isEqual(null, undefined)).toBe(false)
      expect(isEqual(null, 0)).toBe(false)
      expect(isEqual(undefined, 0)).toBe(false)
      expect(isEqual(null, '')).toBe(false)
    })

    it('should handle type mismatches', () => {
      expect(isEqual(1, '1')).toBe(false)
      expect(isEqual(0, false)).toBe(false)
      expect(isEqual(1, true)).toBe(false)
      expect(isEqual('', false)).toBe(false)
    })
  })

  describe('dates', () => {
    it('should compare Date objects', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-01')
      const date3 = new Date('2024-01-02')

      expect(isEqual(date1, date2)).toBe(true)
      expect(isEqual(date1, date3)).toBe(false)
    })

    it('should handle same Date reference', () => {
      const date = new Date('2024-01-01')
      expect(isEqual(date, date)).toBe(true)
    })
  })

  describe('arrays', () => {
    it('should compare empty arrays', () => {
      expect(isEqual([], [])).toBe(true)
    })

    it('should compare arrays with primitives', () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(isEqual([1, 2], [1, 2, 3])).toBe(false)
      expect(isEqual(['a', 'b'], ['a', 'b'])).toBe(true)
    })

    it('should handle same array reference', () => {
      const arr = [1, 2, 3]
      expect(isEqual(arr, arr)).toBe(true)
    })

    it('should compare nested arrays', () => {
      expect(
        isEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ],
        ),
      ).toBe(true)
      expect(
        isEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 5],
          ],
        ),
      ).toBe(false)
    })

    it('should compare arrays with objects', () => {
      expect(isEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true)
      expect(isEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(false)
    })
  })

  describe('objects', () => {
    it('should compare empty objects', () => {
      expect(isEqual({}, {})).toBe(true)
    })

    it('should compare simple objects', () => {
      expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
      expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })

    it('should handle same object reference', () => {
      const obj = { a: 1, b: 2 }
      expect(isEqual(obj, obj)).toBe(true)
    })

    it('should compare objects with different key order', () => {
      expect(isEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    })

    it('should compare nested objects', () => {
      expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
      expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
        false,
      )
    })

    it('should compare objects with arrays', () => {
      expect(isEqual({ a: [1, 2, 3] }, { a: [1, 2, 3] })).toBe(true)
      expect(isEqual({ a: [1, 2, 3] }, { a: [1, 2, 4] })).toBe(false)
    })

    it('should handle missing keys', () => {
      expect(isEqual({ a: undefined }, {})).toBe(false)
      expect(isEqual({ a: 1 }, { b: 1 })).toBe(false)
    })
  })

  describe('min/max objects (attributesMetadata use case)', () => {
    it('should compare min/max objects', () => {
      expect(isEqual({ min: 0, max: 10 }, { min: 0, max: 10 })).toBe(true)
      expect(isEqual({ min: 0, max: 10 }, { min: 0, max: 20 })).toBe(false)
      expect(isEqual({ min: 5, max: 10 }, { min: 0, max: 10 })).toBe(false)
    })

    it('should handle null/undefined min/max objects', () => {
      expect(isEqual(null, null)).toBe(true)
      expect(isEqual({ min: 0, max: 0 }, null)).toBe(false)
      expect(isEqual(null, { min: 0, max: 0 })).toBe(false)
    })
  })

  describe('complex nested structures', () => {
    it('should compare complex nested structures', () => {
      const obj1 = {
        a: 1,
        b: 'hello',
        c: [1, 2, { d: 3 }],
        e: {
          f: true,
          g: [{ h: 'world' }],
        },
      }
      const obj2 = {
        a: 1,
        b: 'hello',
        c: [1, 2, { d: 3 }],
        e: {
          f: true,
          g: [{ h: 'world' }],
        },
      }
      const obj3 = {
        a: 1,
        b: 'hello',
        c: [1, 2, { d: 4 }], // Different here
        e: {
          f: true,
          g: [{ h: 'world' }],
        },
      }

      expect(isEqual(obj1, obj2)).toBe(true)
      expect(isEqual(obj1, obj3)).toBe(false)
    })
  })
})
