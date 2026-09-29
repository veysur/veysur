import { SchemaSpecValidateOptionsCallback } from '@datacapy/schema'

import {
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_CONTENT,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from '../types'
import { entityCodeMeta } from './entityCode'
import { Survey, SurveyEntity } from '../../../Survey'

const entity = { _id: 'entity-1' } as unknown as SurveyEntity
const survey = {
  elements: [
    { _id: 'q-2', code: 'Q002' },
    { _id: 'c-1', kind: 'content', code: 'C001' },
  ],
  sections: [{ _id: 'g-1', code: 'G001' }],
} as unknown as Survey

function getValidator() {
  const spec = entityCodeMeta.getSchemaSpec(entity, survey)
  return (spec.$validate.callback as SchemaSpecValidateOptionsCallback)
    .validator
}

describe('entityCodeMeta', () => {
  describe('metadata shape', () => {
    test('id is "code"', () => {
      expect(entityCodeMeta.id).toBe('code')
    })

    test('applies to group, question, content, answer option, and subquestion entity types', () => {
      expect(entityCodeMeta.entityTypes).toEqual(
        expect.arrayContaining([
          SURVEY_ENTITY_TYPE_SECTION,
          SURVEY_ENTITY_TYPE_ELEMENT,
          SURVEY_ENTITY_TYPE_CONTENT,
          SURVEY_ENTITY_TYPE_ANSWER_OPTION,
          SURVEY_ENTITY_TYPE_SUBQUESTION,
        ]),
      )
    })
  })

  describe('callback validator', () => {
    test('accepts a valid code', () => {
      const validate = getValidator()
      expect(validate('Q001', {})).toBe(true)
    })

    test('rejects reserved code OTHER', () => {
      const validate = getValidator()
      expect(validate('OTHER', {})).toMatch(/reserved/i)
    })

    test('rejects reserved code OTHER_VALUE', () => {
      const validate = getValidator()
      expect(validate('OTHER_VALUE', {})).toMatch(/reserved/i)
    })

    test('rejects reserved code ORDER', () => {
      const validate = getValidator()
      expect(validate('ORDER', {})).toMatch(/reserved/i)
    })

    test('rejects reserved code in lowercase (case-insensitive)', () => {
      const validate = getValidator()
      expect(validate('other', {})).toMatch(/reserved/i)
    })

    test.each(['YES', 'NO', 'P1', 'P10'])(
      'rejects reserved predefined-answer-option code %s',
      (code) => {
        const validate = getValidator()
        expect(validate(code, {})).toMatch(/reserved/i)
      },
    )

    test('rejects a code that duplicates an existing question code', () => {
      const validate = getValidator()
      expect(validate('Q002', {})).toBe('Duplicate code')
    })

    test('rejects a code that duplicates an existing group code', () => {
      const validate = getValidator()
      expect(validate('G001', {})).toBe('Duplicate code')
    })

    test('accepts a code that does not collide with existing codes', () => {
      const validate = getValidator()
      expect(validate('Q003', {})).toBe(true)
    })

    test('rejects a code that duplicates an existing content element code', () => {
      const validate = getValidator()
      expect(validate('C001', {})).toBe('Duplicate code')
    })

    test('rejects a subquestion code that duplicates a sibling subquestion code', () => {
      const subquestionEntity = { _id: 'sq-1' } as unknown as SurveyEntity
      const surveyWithSubquestions = {
        elements: [
          {
            _id: 'q-1',
            code: 'Q001',
            subquestions: [
              { _id: 'sq-1', code: 'S001' },
              { _id: 'sq-2', code: 'S002' },
            ],
            answerOptions: [],
          },
        ],
        sections: [],
      } as unknown as Survey
      const spec = entityCodeMeta.getSchemaSpec(
        subquestionEntity,
        surveyWithSubquestions,
      )
      const validate = (
        spec.$validate.callback as SchemaSpecValidateOptionsCallback
      ).validator
      expect(validate('S002', {})).toBe('Duplicate code')
      expect(validate('S003', {})).toBe(true)
    })

    test('does not reject a subquestion code that duplicates a code outside its own question', () => {
      const subquestionEntity = { _id: 'sq-1' } as unknown as SurveyEntity
      const surveyWithSubquestions = {
        elements: [
          {
            _id: 'q-1',
            code: 'Q001',
            subquestions: [{ _id: 'sq-1', code: 'S001' }],
            answerOptions: [],
          },
          {
            _id: 'q-2',
            code: 'Q002',
            subquestions: [{ _id: 'sq-3', code: 'S002' }],
            answerOptions: [],
          },
        ],
        sections: [],
      } as unknown as Survey
      const spec = entityCodeMeta.getSchemaSpec(
        subquestionEntity,
        surveyWithSubquestions,
      )
      const validate = (
        spec.$validate.callback as SchemaSpecValidateOptionsCallback
      ).validator
      expect(validate('S002', {})).toBe(true)
    })

    test('rejects an answer option code that duplicates a sibling answer option code', () => {
      const answerOptionEntity = { _id: 'ao-1' } as unknown as SurveyEntity
      const surveyWithAnswerOptions = {
        elements: [
          {
            _id: 'q-1',
            code: 'Q001',
            subquestions: [],
            answerOptions: [
              { _id: 'ao-1', code: 'A001' },
              { _id: 'ao-2', code: 'A002' },
            ],
          },
        ],
        sections: [],
      } as unknown as Survey
      const spec = entityCodeMeta.getSchemaSpec(
        answerOptionEntity,
        surveyWithAnswerOptions,
      )
      const validate = (
        spec.$validate.callback as SchemaSpecValidateOptionsCallback
      ).validator
      expect(validate('A002', {})).toBe('Duplicate code')
      expect(validate('A003', {})).toBe(true)
    })

    test('reserved code check takes priority over duplicate check', () => {
      const surveyWithReservedDuplicate = {
        elements: [{ _id: 'q-2', code: 'OTHER' }],
        sections: [],
      }
      const spec = entityCodeMeta.getSchemaSpec(
        entity,
        surveyWithReservedDuplicate as unknown as Survey,
      )
      const validate = (
        spec.$validate.callback as SchemaSpecValidateOptionsCallback
      ).validator
      expect(validate('OTHER', {})).toMatch(/reserved/i)
    })
  })
})
