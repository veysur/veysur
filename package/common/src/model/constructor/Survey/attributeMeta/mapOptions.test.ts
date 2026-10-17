import { Schema } from '@datacapy/schema'

import {
  attributesMetadata,
  AttributeMeta,
  QUESTION_TYPE_MAP,
  SURVEY_ENTITY_TYPE_ELEMENT,
  ATTRIBUTE_QUESTION_MAP_OPTIONS,
  ATTRIBUTE_QUESTION_TYPE,
} from './index'

const byId = (id: string) =>
  attributesMetadata.find((meta) => meta.id === id) as AttributeMeta

async function isValid(value: unknown) {
  const meta = byId(ATTRIBUTE_QUESTION_MAP_OPTIONS)
  const schema = new Schema({ options: { $type: Object, ...meta.schemaSpec } })
  return (await schema.validate({ options: value })).isValid
}

describe('map options attribute metadata', () => {
  const meta = byId(ATTRIBUTE_QUESTION_MAP_OPTIONS)

  test('applies to map questions only', () => {
    expect(meta.typesLimit).toEqual([QUESTION_TYPE_MAP])
    expect(meta.entityTypes).toEqual([SURVEY_ENTITY_TYPE_ELEMENT])
  })

  test('the question type list offers Map', () => {
    expect(byId(ATTRIBUTE_QUESTION_TYPE).options?.[QUESTION_TYPE_MAP]).toBe(
      'Map',
    )
  })

  test('the default value is valid', async () => {
    expect(await isValid(meta.initialValue)).toBe(true)
  })

  test('getValue falls back to the default', () => {
    expect(meta.getValue?.({ attributes: {} } as never)).toEqual(
      meta.initialValue,
    )
  })

  test.each([
    ['provider', 'bing'],
    ['centerLat', 91],
    ['centerLng', -181],
    ['zoom', 0],
    ['zoom', 19],
    ['zoom', 3.5],
    ['countries', 'GB,France'],
    ['precision', 'fuzzy'],
  ])('rejects %s = %j', async (field, bad) => {
    expect(
      await isValid({ ...(meta.initialValue as object), [field]: bad }),
    ).toBe(false)
  })

  test('accepts a blank starting view', async () => {
    expect(
      await isValid({
        ...(meta.initialValue as object),
        centerLat: null,
        centerLng: null,
        zoom: null,
      }),
    ).toBe(true)
  })

  test('accepts a zoom with no position', async () => {
    expect(
      await isValid({
        ...(meta.initialValue as object),
        centerLat: null,
        centerLng: null,
        zoom: 6,
      }),
    ).toBe(true)
  })

  test('the default starting view is automatic', () => {
    expect(meta.initialValue).toEqual(
      expect.objectContaining({ centerLat: null, centerLng: null, zoom: null }),
    )
  })

  test('accepts a configured map', async () => {
    expect(
      await isValid({
        provider: 'google',
        centerLat: 51.5,
        centerLng: -0.1,
        zoom: 10,
        addressSearch: false,
        useMyLocation: true,
        countries: 'GB,FR',
        precision: 'coarse',
      }),
    ).toBe(true)
  })
})
