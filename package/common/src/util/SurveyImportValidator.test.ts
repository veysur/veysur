import { SurveyImportValidator } from './SurveyImportValidator'
import { ImportSurveyData } from './ImportSurveyData'

function createImportData(overrides: Partial<ImportSurveyData> = {}) {
  return {
    survey: { _id: 'survey-1', sectionIds: ['section-1'], elementIds: ['q-1'] },
    sections: [
      {
        _id: 'section-1',
        surveyId: 'survey-1',
        code: 'G001',
        elementIds: ['q-1'],
      },
    ],
    elements: [
      {
        _id: 'q-1',
        surveyId: 'survey-1',
        sectionId: 'section-1',
        code: 'Q001',
        type: 'text',
        answerOptions: [],
        subquestions: [],
      },
    ],
    ...overrides,
  }
}

describe('SurveyImportValidator', () => {
  describe('validateReservedCodes', () => {
    test('valid import data produces no reserved-code errors', async () => {
      const validator = new SurveyImportValidator()
      const result = await validator.validate(createImportData())
      const reservedErrors = result.errors.filter((e) =>
        e.message.includes('reserved'),
      )
      expect(reservedErrors).toHaveLength(0)
    })

    test('group with reserved code produces a schema error', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        sections: [
          {
            _id: 'section-1',
            surveyId: 'survey-1',
            code: 'OTHER',
            elementIds: ['q-1'],
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find(
        (e) => e.field === 'code' && e.entityType === 'section',
      )
      expect(error).toMatchObject({
        type: 'schema',
        entityType: 'section',
        entityId: 'section-1',
        field: 'code',
        repairable: false,
      })
      expect(error?.message).toMatch(/reserved/i)
    })

    test('question with reserved code produces a schema error', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'ORDER',
            type: 'text',
            answerOptions: [],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find(
        (e) => e.field === 'code' && e.entityType === 'element',
      )
      expect(error).toMatchObject({
        type: 'schema',
        entityType: 'element',
        entityId: 'q-1',
        field: 'code',
        repairable: false,
      })
      expect(error?.message).toMatch(/reserved/i)
    })

    test('answer option with reserved code produces a schema error on the parent question', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'checkbox',
            answerOptions: [{ _id: 'ao-1', code: 'OTHER_VALUE' }],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find((e) => e.field === 'answerOptions.code')
      expect(error).toMatchObject({
        type: 'schema',
        entityType: 'element',
        entityId: 'q-1',
        field: 'answerOptions.code',
        repairable: false,
      })
      expect(error?.message).toMatch(/reserved/i)
    })

    test('point-scale question with its own P1..PN label codes is not flagged as reserved', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'point5',
            answerOptions: [
              { _id: 'ao-1', code: 'P1' },
              { _id: 'ao-2', code: 'P5' },
            ],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const reservedErrors = result.errors.filter((e) =>
        e.message.match(/reserved/i),
      )
      expect(reservedErrors).toHaveLength(0)
    })

    test('point-scale question with a P code beyond its own scale count is still flagged as reserved', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'point5',
            answerOptions: [{ _id: 'ao-1', code: 'P6' }],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find((e) => e.field === 'answerOptions.code')
      expect(error?.message).toMatch(/reserved/i)
    })

    test('star and point10 question types with their own P1..PN label codes are not flagged as reserved', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'starRating',
            answerOptions: [
              { _id: 'ao-1', code: 'P1' },
              { _id: 'ao-2', code: 'P5' },
            ],
            subquestions: [],
          },
          {
            _id: 'q-2',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q002',
            type: 'point10',
            answerOptions: [
              { _id: 'ao-3', code: 'P1' },
              { _id: 'ao-4', code: 'P10' },
            ],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const reservedErrors = result.errors.filter((e) =>
        e.message.match(/reserved/i),
      )
      expect(reservedErrors).toHaveLength(0)
    })

    test('Multi-Part question with point-scale-typed subquestions using their own P-codes on nested answer options is not flagged as reserved', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'multiPartPoint5',
            answerOptions: [],
            subquestions: [
              {
                _id: 'sq-1',
                code: 'PART1',
                type: 'point5',
                answerOptions: [
                  { _id: 'ao-1', code: 'P1' },
                  { _id: 'ao-2', code: 'P5' },
                ],
              },
            ],
          },
        ],
      })
      const result = await validator.validate(data)
      const reservedErrors = result.errors.filter((e) =>
        e.message.match(/reserved/i),
      )
      expect(reservedErrors).toHaveLength(0)
    })

    test('non-point-scale question using a P1 code is still flagged as reserved', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'checkbox',
            answerOptions: [{ _id: 'ao-1', code: 'P1' }],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find((e) => e.field === 'answerOptions.code')
      expect(error).toMatchObject({
        type: 'schema',
        entityType: 'element',
        entityId: 'q-1',
        field: 'answerOptions.code',
        repairable: false,
      })
      expect(error?.message).toMatch(/reserved/i)
    })

    test('subquestion with reserved code produces a schema error on the parent question', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'matrixText',
            answerOptions: [],
            subquestions: [{ _id: 'sq-1', code: 'ORDER' }],
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find((e) => e.field === 'subquestions.code')
      expect(error).toMatchObject({
        type: 'schema',
        entityType: 'element',
        entityId: 'q-1',
        field: 'subquestions.code',
        repairable: false,
      })
      expect(error?.message).toMatch(/reserved/i)
    })

    test('reserved code in lowercase is rejected (case-insensitive)', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        sections: [
          {
            _id: 'section-1',
            surveyId: 'survey-1',
            code: 'other',
            elementIds: ['q-1'],
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find(
        (e) => e.field === 'code' && e.entityType === 'section',
      )
      expect(error).toBeDefined()
      expect(error?.message).toMatch(/reserved/i)
    })

    test('content element with a valid content type passes element-type validation', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'text',
            answerOptions: [],
            subquestions: [],
          },
          {
            _id: 'c-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            kind: 'content',
            code: 'C001',
            type: 'contentText',
          },
        ],
      })
      const result = await validator.validate(data)
      expect(
        result.errors.filter((e) => e.type === 'elementType'),
      ).toHaveLength(0)
    })

    test('content-typed element with no kind is still treated as content, not a bad question', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'c-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'C001',
            type: 'contentVideoYoutube',
          },
        ],
      })
      const result = await validator.validate(data)
      expect(
        result.errors.filter((e) => e.type === 'elementType'),
      ).toHaveLength(0)
    })

    test('content element with an unknown content type is flagged', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'c-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            kind: 'content',
            code: 'C001',
            type: 'contentHologram',
          },
        ],
      })
      const result = await validator.validate(data)
      const error = result.errors.find((e) => e.type === 'elementType')
      expect(error).toMatchObject({
        entityType: 'element',
        entityId: 'c-1',
        field: 'type',
      })
      expect(error?.message).toMatch(/content element type/i)
    })

    test('multiple reserved codes are all reported', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        sections: [
          {
            _id: 'section-1',
            surveyId: 'survey-1',
            code: 'OTHER',
            elementIds: ['q-1'],
          },
        ],
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'ORDER',
            type: 'text',
            answerOptions: [{ _id: 'ao-1', code: 'OTHER_VALUE' }],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const reservedErrors = result.errors.filter((e) =>
        e.message.match(/reserved/i),
      )
      expect(reservedErrors).toHaveLength(3)
    })
  })

  describe('validateElementTypes', () => {
    test('fileUpload question type is accepted', async () => {
      const validator = new SurveyImportValidator()
      const data = createImportData({
        elements: [
          {
            _id: 'q-1',
            surveyId: 'survey-1',
            sectionId: 'section-1',
            code: 'Q001',
            type: 'fileUpload',
            answerOptions: [],
            subquestions: [],
          },
        ],
      })
      const result = await validator.validate(data)
      const typeErrors = result.errors.filter((e) => e.type === 'elementType')
      expect(typeErrors).toHaveLength(0)
    })
  })
})
