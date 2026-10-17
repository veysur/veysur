import {
  authoredMapCenter,
  resolveMapStartView,
  MAP_PRECISION_COARSE,
  MAP_PRECISION_EXACT,
  effectiveMapPrecision,
  findMapAnswerIssue,
  isMapAnswer,
  parseMapCountries,
  roundMapCoordinate,
  toMapAnswer,
} from './MapAnswer'

describe('MapAnswer', () => {
  describe('roundMapCoordinate', () => {
    test('rounds to one decimal when coarse', () => {
      expect(roundMapCoordinate(51.5074, MAP_PRECISION_COARSE)).toBe(51.5)
      expect(roundMapCoordinate(-0.1278, MAP_PRECISION_COARSE)).toBe(-0.1)
    })

    test('leaves exact coordinates alone', () => {
      expect(roundMapCoordinate(51.5074, MAP_PRECISION_EXACT)).toBe(51.5074)
    })
  })

  describe('effectiveMapPrecision', () => {
    test('anonymous surveys are always coarse', () => {
      expect(effectiveMapPrecision(MAP_PRECISION_EXACT, true)).toBe(
        MAP_PRECISION_COARSE,
      )
    })

    test('follows the question otherwise, defaulting to exact', () => {
      expect(effectiveMapPrecision(MAP_PRECISION_COARSE, false)).toBe(
        MAP_PRECISION_COARSE,
      )
      expect(effectiveMapPrecision(undefined, false)).toBe(MAP_PRECISION_EXACT)
    })
  })

  describe('toMapAnswer', () => {
    test('keeps the address on an exact pin', () => {
      expect(
        toMapAnswer(51.5074, -0.1278, MAP_PRECISION_EXACT, {
          address: 'London',
          countryCode: 'gb',
        }),
      ).toEqual({
        lat: 51.5074,
        lng: -0.1278,
        precision: 'exact',
        address: 'London',
        countryCode: 'GB',
      })
    })

    test('rounds and drops the address on a coarse pin', () => {
      expect(
        toMapAnswer(51.5074, -0.1278, MAP_PRECISION_COARSE, {
          address: 'London',
        }),
      ).toEqual({ lat: 51.5, lng: -0.1, precision: 'coarse' })
    })
  })

  describe('isMapAnswer', () => {
    test.each([
      [{ lat: 0, lng: 0 }, true],
      [{ lat: 90, lng: -180 }, true],
      [{ lat: 91, lng: 0 }, false],
      [{ lat: 0, lng: 181 }, false],
      [{ lat: '1', lng: 2 }, false],
      [{ lat: NaN, lng: 2 }, false],
      [null, false],
      [[1, 2], false],
      ['1,2', false],
    ])('%j → %s', (value, expected) => {
      expect(isMapAnswer(value)).toBe(expected)
    })
  })

  describe('findMapAnswerIssue', () => {
    const pin = { lat: 51.5, lng: -0.1, precision: 'coarse' }

    test('accepts a valid pin', () => {
      expect(findMapAnswerIssue({ lat: 51.5074, lng: -0.1278 })).toBeNull()
    })

    test('rejects a malformed pin or oversized address', () => {
      expect(findMapAnswerIssue({ lat: 'x' })).toBe('invalid')
      expect(
        findMapAnswerIssue({ lat: 1, lng: 1, address: 'a'.repeat(501) }),
      ).toBe('invalid')
      expect(findMapAnswerIssue({ lat: 1, lng: 1, address: 5 })).toBe('invalid')
    })

    test('coarse rules accept a rounded pin without an address', () => {
      expect(
        findMapAnswerIssue(pin, { precision: MAP_PRECISION_COARSE }),
      ).toBeNull()
    })

    test.each([
      ['exact precision label', { ...pin, precision: 'exact' }],
      ['unrounded coordinates', { ...pin, lat: 51.5074 }],
      ['an address', { ...pin, address: 'London' }],
    ])('coarse rules reject %s', (_label, value) => {
      expect(
        findMapAnswerIssue(value, { precision: MAP_PRECISION_COARSE }),
      ).toBe('precision')
    })

    test('country rules need a listed country code', () => {
      const rules = { countries: 'gb, FR' }
      expect(
        findMapAnswerIssue({ ...pin, countryCode: 'gb' }, rules),
      ).toBeNull()
      expect(findMapAnswerIssue({ ...pin, countryCode: 'DE' }, rules)).toBe(
        'country',
      )
      expect(findMapAnswerIssue(pin, rules)).toBe('country')
    })

    test('an empty country list allows any country', () => {
      expect(findMapAnswerIssue(pin, { countries: '' })).toBeNull()
    })
  })

  test('parseMapCountries trims, upper-cases and drops blanks', () => {
    expect(parseMapCountries(' gb,, fr ,')).toEqual(['GB', 'FR'])
    expect(parseMapCountries(undefined)).toEqual([])
  })
})

describe('authoredMapCenter', () => {
  test('needs both a latitude and a longitude', () => {
    expect(authoredMapCenter({ centerLat: 51.5, centerLng: -0.1 })).toEqual({
      lat: 51.5,
      lng: -0.1,
    })
    expect(authoredMapCenter({ centerLat: 51.5, centerLng: null })).toBeNull()
    expect(authoredMapCenter({ centerLat: null, centerLng: null })).toBeNull()
    expect(authoredMapCenter({})).toBeNull()
  })

  test('accepts zero as a position', () => {
    expect(authoredMapCenter({ centerLat: 0, centerLng: 0 })).toEqual({
      lat: 0,
      lng: 0,
    })
  })
})

describe('resolveMapStartView', () => {
  test('uses the author position with country zoom by default', () => {
    expect(resolveMapStartView({ centerLat: 10, centerLng: 20 })).toEqual({
      lat: 10,
      lng: 20,
      zoom: 5,
    })
  })

  test('keeps an author zoom with an author centre', () => {
    expect(
      resolveMapStartView({ centerLat: 10, centerLng: 20, zoom: 9 }).zoom,
    ).toBe(9)
  })

  test('ignores a zoom when there is no author centre', () => {
    expect(resolveMapStartView({ zoom: 4 })).toEqual({
      lat: 20,
      lng: 0,
      zoom: 3,
    })
  })

  test('falls back to the world', () => {
    expect(resolveMapStartView({})).toEqual({ lat: 20, lng: 0, zoom: 3 })
  })
})
