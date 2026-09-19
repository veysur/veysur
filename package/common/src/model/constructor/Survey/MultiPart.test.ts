import {
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
} from './attributeMeta/types'
import {
  MULTI_PART_QUESTION_TYPES,
  MULTI_PART_TYPE_CONFIG,
  MULTI_PART_STATS_COMPATIBLE_TYPES,
  isMultiPartQuestionType,
  isMultiPartStatsCompatibleType,
  getMultiPartTypeConfig,
  getMultiPartDefaultSubquestionType,
  hasAnyMultiPartFilled,
  MultiPartValue,
  MultiPartResponseData,
} from './MultiPart'

describe('MultiPart', () => {
  describe('MULTI_PART_QUESTION_TYPES', () => {
    test('contains exactly the six Multi-Part variants', () => {
      expect(MULTI_PART_QUESTION_TYPES).toEqual([
        QUESTION_TYPE_MULTI_PART_TEXT,
        QUESTION_TYPE_MULTI_PART_NUMBER,
        QUESTION_TYPE_MULTI_PART_YES_NO,
        QUESTION_TYPE_MULTI_PART_STAR_RATING,
        QUESTION_TYPE_MULTI_PART_POINT_5,
        QUESTION_TYPE_MULTI_PART_POINT_10,
      ])
    })
  })

  describe('isMultiPartQuestionType', () => {
    test('returns true for every Multi-Part variant', () => {
      for (const type of MULTI_PART_QUESTION_TYPES) {
        expect(isMultiPartQuestionType(type)).toBe(true)
      }
    })

    test('returns false for non-Multi-Part types', () => {
      expect(isMultiPartQuestionType(QUESTION_TYPE_TEXT)).toBe(false)
      expect(isMultiPartQuestionType('matrixText')).toBe(false)
      expect(isMultiPartQuestionType('')).toBe(false)
    })
  })

  describe('MULTI_PART_TYPE_CONFIG / getMultiPartTypeConfig', () => {
    test('maps each Multi-Part type to its enforced part type', () => {
      expect(
        getMultiPartTypeConfig(QUESTION_TYPE_MULTI_PART_TEXT)?.partType,
      ).toBe(QUESTION_TYPE_TEXT)
      expect(
        getMultiPartTypeConfig(QUESTION_TYPE_MULTI_PART_NUMBER)?.partType,
      ).toBe(QUESTION_TYPE_NUMBER)
      expect(
        getMultiPartTypeConfig(QUESTION_TYPE_MULTI_PART_YES_NO)?.partType,
      ).toBe(QUESTION_TYPE_YES_NO)
      expect(
        getMultiPartTypeConfig(QUESTION_TYPE_MULTI_PART_STAR_RATING)?.partType,
      ).toBe(QUESTION_TYPE_STAR_RATING)
      expect(
        getMultiPartTypeConfig(QUESTION_TYPE_MULTI_PART_POINT_5)?.partType,
      ).toBe(QUESTION_TYPE_POINT_5)
      expect(
        getMultiPartTypeConfig(QUESTION_TYPE_MULTI_PART_POINT_10)?.partType,
      ).toBe(QUESTION_TYPE_POINT_10)
    })

    test('returns undefined for a non-Multi-Part type', () => {
      expect(getMultiPartTypeConfig(QUESTION_TYPE_TEXT)).toBeUndefined()
    })

    test('every config entry is also present in MULTI_PART_TYPE_CONFIG', () => {
      for (const type of MULTI_PART_QUESTION_TYPES) {
        expect(MULTI_PART_TYPE_CONFIG[type]).toBeDefined()
      }
    })
  })

  describe('getMultiPartDefaultSubquestionType', () => {
    test('returns the enforced part type for a known Multi-Part type', () => {
      expect(
        getMultiPartDefaultSubquestionType(QUESTION_TYPE_MULTI_PART_NUMBER),
      ).toBe(QUESTION_TYPE_NUMBER)
    })

    test('falls back to text for an unknown type', () => {
      expect(getMultiPartDefaultSubquestionType('unknownType')).toBe(
        QUESTION_TYPE_TEXT,
      )
    })
  })

  describe('MULTI_PART_STATS_COMPATIBLE_TYPES / isMultiPartStatsCompatibleType', () => {
    test('excludes Multi-Part Text but includes every other variant', () => {
      expect(MULTI_PART_STATS_COMPATIBLE_TYPES).toEqual([
        QUESTION_TYPE_MULTI_PART_NUMBER,
        QUESTION_TYPE_MULTI_PART_YES_NO,
        QUESTION_TYPE_MULTI_PART_STAR_RATING,
        QUESTION_TYPE_MULTI_PART_POINT_5,
        QUESTION_TYPE_MULTI_PART_POINT_10,
      ])
      expect(
        isMultiPartStatsCompatibleType(QUESTION_TYPE_MULTI_PART_TEXT),
      ).toBe(false)
      expect(
        isMultiPartStatsCompatibleType(QUESTION_TYPE_MULTI_PART_NUMBER),
      ).toBe(true)
    })
  })

  describe('MultiPartValue / MultiPartResponseData', () => {
    test('accepts a flat map of part code to value', () => {
      const data: MultiPartResponseData = {
        P001: 'Text answer',
        P002: 42,
        P003: true,
      }
      expect(data['P001']).toBe('Text answer')
      expect(data['P002']).toBe(42)
      expect(data['P003']).toBe(true)
    })

    test('accepts empty response data', () => {
      const data: MultiPartResponseData = {}
      expect(data).toEqual({})
    })

    test('MultiPartValue accepts string, number, and boolean', () => {
      const a: MultiPartValue = 'text'
      const b: MultiPartValue = 5
      const c: MultiPartValue = false
      expect(a).toBe('text')
      expect(b).toBe(5)
      expect(c).toBe(false)
    })
  })

  describe('hasAnyMultiPartFilled', () => {
    test('returns false for null/undefined/non-object values', () => {
      expect(hasAnyMultiPartFilled(null)).toBe(false)
      expect(hasAnyMultiPartFilled(undefined)).toBe(false)
      expect(hasAnyMultiPartFilled('string')).toBe(false)
      expect(hasAnyMultiPartFilled(42)).toBe(false)
    })

    test('returns false for an empty object', () => {
      expect(hasAnyMultiPartFilled({})).toBe(false)
    })

    test('returns false when every part value is null, undefined, or empty string', () => {
      expect(
        hasAnyMultiPartFilled({ P001: null, P002: undefined, P003: '' }),
      ).toBe(false)
    })

    test('returns true when at least one part has a non-empty value', () => {
      expect(hasAnyMultiPartFilled({ P001: null, P002: 'answer' })).toBe(true)
    })

    test('treats false as a filled value (valid yes/no answer)', () => {
      expect(hasAnyMultiPartFilled({ P001: false })).toBe(true)
    })

    test('treats 0 as a filled value (valid number answer)', () => {
      expect(hasAnyMultiPartFilled({ P001: 0 })).toBe(true)
    })
  })
})
