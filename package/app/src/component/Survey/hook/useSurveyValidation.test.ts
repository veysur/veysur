// cspell:ignore Essen
import { act, renderHook } from '@testing-library/react'
import { SurveyQuestion, SurveySection } from 'veysur-common'

import { useSurveyValidation } from './useSurveyValidation'
import type { QuestionWithGroup } from '../SurveyTypes'

function buildGroup(_id: string): SurveySection {
  return new SurveySection({ _id, code: 'G1' })
}

function buildQuestion(
  overrides: Partial<ConstructorParameters<typeof SurveyQuestion>[0]> = {},
): SurveyQuestion {
  return new SurveyQuestion({
    code: 'Q1',
    type: 'text',
    sectionId: 'G1',
    attributes: {},
    ...overrides,
  })
}

function setup(
  items: QuestionWithGroup[],
  language = 'en',
  defaultLanguage = 'en',
) {
  return renderHook(() => useSurveyValidation(items, language, defaultLanguage))
}

describe('useSurveyValidation', () => {
  describe('validateQuestion', () => {
    it('reports an error for a blank required question', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({ attributes: { required: true } })
      const { result } = setup([{ question, group }])

      await act(async () => {
        const isValid = await result.current.validateQuestion('Q1', '')
        expect(isValid).toBe(false)
      })

      expect(result.current.validationErrors.Q1).toBeDefined()
    })

    it('requires a value for "Other" on a required choice question', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({
        type: 'checkbox',
        attributes: { required: true, choiceOther: true },
      })
      const { result } = setup([{ question, group }])

      await act(async () => {
        const isValid = await result.current.validateQuestion('Q1', {
          OTHER: true,
        })
        expect(isValid).toBe(false)
      })
      expect(result.current.validationErrors.Q1).toContainEqual({
        key: 'validation.otherRequired',
      })

      await act(async () => {
        const isValid = await result.current.validateQuestion('Q1', {
          OTHER: true,
          OTHER_VALUE: 'my answer',
        })
        expect(isValid).toBe(true)
      })
      expect(result.current.validationErrors.Q1).toBeUndefined()
    })

    it('clears errors once a required question is filled in', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({ attributes: { required: true } })
      const { result } = setup([{ question, group }])

      await act(async () => {
        await result.current.validateQuestion('Q1', '')
      })
      expect(result.current.validationErrors.Q1).toBeDefined()

      await act(async () => {
        await result.current.validateQuestion('Q1', 'hello')
      })
      expect(result.current.validationErrors.Q1).toBeUndefined()
    })
  })

  describe('validateCurrentView', () => {
    it('blocks navigation on a required question left blank, in question format', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({ attributes: { required: true } })
      const { result } = setup([{ question, group }])

      await act(async () => {
        const isValid = await result.current.validateCurrentView(
          'question',
          undefined,
          0,
          0,
          {},
        )
        expect(isValid).toBe(false)
      })
      expect(result.current.validationErrors.Q1).toBeDefined()
    })

    it('does not block navigation on choiceMinMax alone (required-only nav gating)', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({
        type: 'checkbox',
        attributes: { required: true, choiceMinMax: { min: 2, max: 3 } },
      })
      const { result } = setup([{ question, group }])

      await act(async () => {
        const isValid = await result.current.validateCurrentView(
          'question',
          undefined,
          0,
          0,
          { Q1: { A: true } },
        )
        // Only one option selected (below the min of 2), but navigation
        // gating only checks "required", not choiceMinMax, so it passes.
        expect(isValid).toBe(true)
      })
    })

    it('blocks navigation on a required matrix subquestion left blank', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          { code: 'S1', type: 'text', attributes: { required: true } },
        ],
        answerOptions: [{ code: 'R1' }],
      })
      const { result } = setup([{ question, group }])

      await act(async () => {
        const isValid = await result.current.validateCurrentView(
          'question',
          undefined,
          0,
          0,
          { Q1: {} },
        )
        expect(isValid).toBe(false)
      })
      expect(result.current.validationErrors.Q1).toBeDefined()
    })

    it('reports a required matrix subquestion using its localized text, not its code', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          {
            code: 'S001',
            type: 'text',
            text: { en: 'Food', de: 'Essen' },
            attributes: { required: true },
          },
        ],
        answerOptions: [{ code: 'R1' }],
      })
      const { result } = setup([{ question, group }], 'de', 'en')

      await act(async () => {
        const isValid = await result.current.validateCurrentView(
          'question',
          undefined,
          0,
          0,
          { Q1: {} },
        )
        expect(isValid).toBe(false)
      })
      // Regression: this must show the German subquestion text ("Essen"),
      // not the meaningless internal code ("S001").
      expect(result.current.validationErrors.Q1).toContainEqual({
        key: 'validation.itemRequired',
        params: { label: 'Essen' },
      })
    })

    it('groups format validates all questions in the current group', async () => {
      const group = buildGroup('G1')
      const q1 = buildQuestion({ code: 'Q1', attributes: { required: true } })
      const q2 = buildQuestion({ code: 'Q2', attributes: { required: true } })
      const { result } = setup([
        { question: q1, group },
        { question: q2, group },
      ])

      await act(async () => {
        const isValid = await result.current.validateCurrentView(
          'group',
          undefined,
          0,
          0,
          { Q1: 'filled', Q2: '' },
        )
        expect(isValid).toBe(false)
      })
      expect(result.current.validationErrors.Q1).toBeUndefined()
      expect(result.current.validationErrors.Q2).toBeDefined()
    })
  })

  describe('validateAllAnswers', () => {
    it('enforces full constraints, including choiceMinMax', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({
        type: 'checkbox',
        attributes: { required: true, choiceMinMax: { min: 2, max: 3 } },
      })
      const { result } = setup([{ question, group }])

      await act(async () => {
        const isValid = await result.current.validateAllAnswers({
          Q1: { A: true },
        })
        expect(isValid).toBe(false)
      })
      expect(result.current.validationErrors.Q1).toContainEqual({
        key: 'validation.choiceCount_between',
        params: { min: 2, max: 3 },
      })
    })

    it('passes when all constraints are satisfied', async () => {
      const group = buildGroup('G1')
      const question = buildQuestion({ attributes: { required: true } })
      const { result } = setup([{ question, group }])

      await act(async () => {
        const isValid = await result.current.validateAllAnswers({
          Q1: 'hello',
        })
        expect(isValid).toBe(true)
      })
      expect(result.current.validationErrors).toEqual({})
    })
  })

  describe('hasRequiredQuestionsInCurrentView', () => {
    it('returns true when the current question is required', () => {
      const group = buildGroup('G1')
      const question = buildQuestion({ attributes: { required: true } })
      const { result } = setup([{ question, group }])

      expect(
        result.current.hasRequiredQuestionsInCurrentView(
          'question',
          undefined,
          0,
          0,
        ),
      ).toBe(true)
    })

    it('returns false when nothing in view is required', () => {
      const group = buildGroup('G1')
      // SurveyQuestion defaults `required` to true, so it must be
      // explicitly overridden to false here.
      const question = buildQuestion({ attributes: { required: false } })
      const { result } = setup([{ question, group }])

      expect(
        result.current.hasRequiredQuestionsInCurrentView(
          'question',
          undefined,
          0,
          0,
        ),
      ).toBe(false)
    })
  })
})
