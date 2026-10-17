import { SURVEY_ENTITY_TYPE_CONTENT } from 'veysur-common'

import {
  attributesConfig,
  attributeSetsConfig,
  getAttributeSets,
  getAttributes,
} from './attributesConfig'
import { ATTRIBUTE_CONTENT_TYPE } from './constant'

describe('attributesConfig - subquestion type is not user-editable', () => {
  test('no attribute config drives a "subquestionType" field', () => {
    expect(
      attributesConfig.some((attribute) => attribute.id === 'subquestionType'),
    ).toBe(false)
  })

  test('no attribute set references a "subquestionType" attribute id', () => {
    for (const set of attributeSetsConfig) {
      expect(set.attributeIds).not.toContain('subquestionType')
    }
  })
})

describe('attributesConfig - content elements', () => {
  test('the basic set applies to content elements', () => {
    const sets = getAttributeSets(SURVEY_ENTITY_TYPE_CONTENT)
    expect(sets.map((s) => s.id)).toContain('basic')
  })

  test('content elements get code, type, and condition attributes', () => {
    const [basic] = getAttributeSets(SURVEY_ENTITY_TYPE_CONTENT)
    const ids = getAttributes(
      basic.attributeIds,
      SURVEY_ENTITY_TYPE_CONTENT,
    ).map((a) => a.id)
    expect(ids).toEqual(
      expect.arrayContaining([ATTRIBUTE_CONTENT_TYPE, 'code', 'condition']),
    )
  })

  test('the question type attribute does not leak onto content elements', () => {
    const ids = getAttributes(['type'], SURVEY_ENTITY_TYPE_CONTENT).map(
      (a) => a.id,
    )
    expect(ids).not.toContain('type')
  })
})

describe('attributesConfig - text format', () => {
  const visible = (id: string, textFormat: string) => {
    const config = attributesConfig.find((a) => a.id === id)!
    return config.isVisible!({ attributes: { textFormat } } as never)
  }

  test('countries show only for the phone format', () => {
    expect(visible('textFormatCountries', 'phone')).toBe(true)
    expect(visible('textFormatCountries', 'email')).toBe(false)
    expect(visible('textFormatCountries', 'custom')).toBe(false)
  })

  test('pattern shows only for the custom format', () => {
    expect(visible('textFormatPattern', 'custom')).toBe(true)
    expect(visible('textFormatPattern', 'phone')).toBe(false)
  })

  test('the preset selector is always shown and sits in the basic set', () => {
    const config = attributesConfig.find((a) => a.id === 'textFormat')!
    expect(config.isVisible).toBeUndefined()
    const basic = attributeSetsConfig.find((s) => s.id === 'basic')!
    expect(basic.attributeIds).toContain('textFormat')
  })
})
