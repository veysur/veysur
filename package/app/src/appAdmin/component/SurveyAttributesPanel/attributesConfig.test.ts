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
