import { Survey } from '../../constructor/Survey'
import { SurveySubquestionData } from '../../constructor/Survey/SurveySubquestion'
import { CompatibilityChecker } from './CompatibilityChecker'

describe('CompatibilityChecker', () => {
  const checker = new CompatibilityChecker()

  const makeMatrixSurvey = (subquestions: Partial<SurveySubquestionData>[]) =>
    new Survey({
      createdById: 'user1',
      elements: [
        {
          code: 'Q1',
          type: 'matrixComposite',
          text: { en: 'Matrix Question' },
          createdById: 'user1',
          surveyId: 'survey1',
          subquestions,
        },
      ],
    })

  describe('subquestion type compatibility', () => {
    test('same type produces no incompatibility', () => {
      const surveyA = makeMatrixSurvey([
        { code: 'S1', type: 'number', text: { en: 'Column' } },
      ])
      const surveyB = makeMatrixSurvey([
        { code: 'S1', type: 'number', text: { en: 'Column' } },
      ])

      const result = checker.check(surveyA, surveyB)

      expect(result.isCompatible).toBe(true)
      expect(result.summary.incompatibleSubquestionTypes).toBe(0)
    })

    test('type change produces incompatible_subquestion_type incompatibility', () => {
      const surveyA = makeMatrixSurvey([
        { code: 'S1', type: 'number', text: { en: 'Column' } },
      ])
      const surveyB = makeMatrixSurvey([
        { code: 'S1', type: 'checkbox', text: { en: 'Column' } },
      ])

      const result = checker.check(surveyA, surveyB)

      expect(result.isCompatible).toBe(false)
      expect(result.summary.incompatibleSubquestionTypes).toBe(1)
      expect(result.incompatibilities).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].subquestions[S1]',
          reason: 'incompatible_subquestion_type',
          itemType: 'subquestion',
          itemCode: 'S1',
          surveyAType: 'number',
          surveyBType: 'checkbox',
        }),
      )
    })

    test('summary counts multiple type changes correctly', () => {
      const surveyA = makeMatrixSurvey([
        { code: 'S1', type: 'text', text: { en: 'Col 1' } },
        { code: 'S2', type: 'number', text: { en: 'Col 2' } },
      ])
      const surveyB = makeMatrixSurvey([
        { code: 'S1', type: 'date', text: { en: 'Col 1' } },
        { code: 'S2', type: 'checkbox', text: { en: 'Col 2' } },
      ])

      const result = checker.check(surveyA, surveyB)

      expect(result.summary.incompatibleSubquestionTypes).toBe(2)
    })
  })

  describe('participant attribute compatibility', () => {
    const emptySurvey = new Survey({
      createdById: 'u1',
      elements: [],
    })

    test('missing attribute in survey-b produces missing_participant_attribute', () => {
      const result = checker.check(
        emptySurvey,
        emptySurvey,
        [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
        [],
      )

      expect(result.isCompatible).toBe(false)
      expect(result.summary.missingParticipantAttributes).toBe(1)
      expect(result.incompatibilities).toContainEqual(
        expect.objectContaining({
          path: 'participantAttributes[department]',
          reason: 'missing_participant_attribute',
          itemType: 'participantAttribute',
          itemCode: 'department',
        }),
      )
    })

    test('attribute required in B but not A produces incompatible_required_constraint', () => {
      const result = checker.check(
        emptySurvey,
        emptySurvey,
        [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
        [
          {
            name: 'department',
            required: true,
            internal: false,
            example: null,
          },
        ],
      )

      expect(result.isCompatible).toBe(false)
      expect(result.summary.incompatibleRequiredConstraints).toBe(1)
      expect(result.incompatibilities).toContainEqual(
        expect.objectContaining({
          reason: 'incompatible_required_constraint',
          itemType: 'participantAttribute',
          itemCode: 'department',
        }),
      )
    })

    test('identical attribute sets produce no incompatibilities', () => {
      const attrs = [
        { name: 'department', required: true, internal: false, example: null },
        { name: 'region', required: false, internal: false, example: null },
      ]

      const result = checker.check(emptySurvey, emptySurvey, attrs, attrs)

      expect(result.isCompatible).toBe(true)
      expect(result.summary.missingParticipantAttributes).toBe(0)
    })

    test('attribute only in B (not A) is ignored — B can have extras', () => {
      const result = checker.check(
        emptySurvey,
        emptySurvey,
        [],
        [
          {
            name: 'department',
            required: true,
            internal: false,
            example: null,
          },
        ],
      )

      expect(result.isCompatible).toBe(true)
    })
  })

  describe('regression: missing subquestion', () => {
    test('removed subquestion still produces missing_subquestion incompatibility', () => {
      const surveyA = makeMatrixSurvey([
        { code: 'S1', type: 'text', text: { en: 'Col 1' } },
        { code: 'S2', type: 'text', text: { en: 'Col 2' } },
      ])
      const surveyB = makeMatrixSurvey([
        { code: 'S1', type: 'text', text: { en: 'Col 1' } },
      ])

      const result = checker.check(surveyA, surveyB)

      expect(result.isCompatible).toBe(false)
      expect(result.summary.missingSubquestions).toBe(1)
      expect(result.incompatibilities).toContainEqual(
        expect.objectContaining({
          reason: 'missing_subquestion',
          itemCode: 'S2',
        }),
      )
    })
  })
})
