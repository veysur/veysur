import { Schema } from '@datacapy/schema'

import {
  attributesMetadata,
  AttributeMeta,
  QUESTION_TYPE_TEXT,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  ATTRIBUTE_QUESTION_TEXT_FORMAT,
  ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES,
  ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN,
} from './index'

const byId = (id: string) =>
  attributesMetadata.find((meta) => meta.id === id) as AttributeMeta

async function isValid(meta: AttributeMeta, value: unknown) {
  const schema = new Schema({ [meta.name]: meta.schemaSpec })
  return (await schema.validate({ [meta.name]: value })).isValid
}

describe('text format attribute metadata', () => {
  test.each([
    ATTRIBUTE_QUESTION_TEXT_FORMAT,
    ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES,
    ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN,
  ])('%s applies to text questions and subquestions only', (id) => {
    const meta = byId(id)
    expect(meta.typesLimit).toEqual([QUESTION_TYPE_TEXT])
    expect(meta.entityTypes).toEqual([
      SURVEY_ENTITY_TYPE_ELEMENT,
      SURVEY_ENTITY_TYPE_SUBQUESTION,
    ])
  })

  test('getValue falls back to the initial value', () => {
    for (const id of [
      ATTRIBUTE_QUESTION_TEXT_FORMAT,
      ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES,
      ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN,
    ]) {
      const meta = byId(id)
      expect(meta.getValue({ attributes: {} } as never)).toBe(meta.initialValue)
    }
  })

  describe('textFormat schema', () => {
    const meta = byId(ATTRIBUTE_QUESTION_TEXT_FORMAT)

    test('accepts every preset', async () => {
      for (const value of ['none', 'email', 'phone', 'url', 'custom']) {
        expect(await isValid(meta, value)).toBe(true)
      }
    })

    test('rejects an unknown preset and an empty value', async () => {
      expect(await isValid(meta, 'postcode')).toBe(false)
      expect(await isValid(meta, '')).toBe(false)
    })
  })

  describe('textFormatCountries schema', () => {
    const meta = byId(ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES)

    test('accepts empty and comma-separated two-letter codes', async () => {
      for (const value of ['', 'GB', 'GB,US', ' gb , us ']) {
        expect(await isValid(meta, value)).toBe(true)
      }
    })

    test('rejects names, wrong lengths and stray separators', async () => {
      for (const value of ['UK1', 'United Kingdom', 'GB,', ',GB', 'GBR']) {
        expect(await isValid(meta, value)).toBe(false)
      }
    })
  })

  describe('textFormatPattern schema', () => {
    const meta = byId(ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN)

    test('accepts empty and a safe pattern', async () => {
      expect(await isValid(meta, '')).toBe(true)
      expect(await isValid(meta, '[A-Z]{2}\\d{4}')).toBe(true)
    })

    test('rejects an invalid, nested-repetition or over-long pattern', async () => {
      expect(await isValid(meta, '(')).toBe(false)
      expect(await isValid(meta, '(a+)+$')).toBe(false)
      expect(await isValid(meta, 'a'.repeat(201))).toBe(false)
    })
  })
})
