jest.useRealTimers()

import { schemaManager } from '../schema-manager'
import { SurveySubquestionCollection } from '../constructor'

/**
 * Regression: a question's `subquestions` must be hydrated as
 * `SurveySubquestionCollection` items. Hydrating them through
 * `SurveyElementCollection` turned each one into a question carrying
 * `kind`, `condition`, `subquestions` and `answerOptions`, which the strict
 * `surveySubquestion` schema then rejected at publish and import.
 */
describe('SchemaSurveySubquestion: construct on read', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString()

  it('builds a SurveySubquestionCollection without question-only fields', async () => {
    const schema = schemaManager.getSchema('surveyElement')!
    const rows = [
      {
        _id: 'q1',
        surveyId: 's1',
        createdById: 'u1',
        kind: 'question',
        type: 'matrixCheckbox',
        code: 'Q001',
        sectionId: 'g1',
        text: {},
        subquestions: [
          {
            _id: 'sq1',
            type: 'text',
            code: 'S001',
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ]

    const result = schema.applyTransients(rows) as unknown as {
      getById: (id: string) => { subquestions: SurveySubquestionCollection }
    }
    const { subquestions } = result.getById('q1')

    expect(subquestions).toBeInstanceOf(SurveySubquestionCollection)
    expect(Object.keys(subquestions[0])).not.toContain('kind')
    expect((await schema.validate(result.getById('q1'))).errors).toEqual({})
  })
})
