import {
  buildAnswerOptionCodesForQuestion,
  buildAnswerOptionsForQuestion,
  buildPredefinedAnswerOptionLiterals,
} from './predefinedAnswerOptions'
import { QuestionInfo } from './types'

describe('predefinedAnswerOptions', () => {
  describe('buildAnswerOptionCodesForQuestion', () => {
    it('returns predefined codes for yesNo, ignoring any stored answerOptions', () => {
      expect(
        buildAnswerOptionCodesForQuestion({
          type: 'yesNo',
          answerOptions: [{ code: 'A001' }],
        }),
      ).toEqual(['YES', 'NO'])
    })

    it('returns stored answerOptions codes plus OTHER when choiceOther is enabled', () => {
      expect(
        buildAnswerOptionCodesForQuestion({
          type: 'checkbox',
          answerOptions: [{ code: 'A001' }, { code: 'A002' }],
          attributes: { choiceOther: true },
        }),
      ).toEqual(['A001', 'A002', 'OTHER'])
    })

    it('excludes OTHER when choiceOther is not enabled', () => {
      expect(
        buildAnswerOptionCodesForQuestion({
          type: 'checkbox',
          answerOptions: [{ code: 'A001' }],
        }),
      ).toEqual(['A001'])
    })

    it('returns an empty array for a question with no options and no choiceOther', () => {
      expect(buildAnswerOptionCodesForQuestion({ type: 'text' })).toEqual([])
    })
  })

  describe('buildAnswerOptionsForQuestion', () => {
    it('returns the predefined numeric labels for a point scale with no captions', () => {
      expect(
        buildAnswerOptionsForQuestion({ type: 'point5' }, () => undefined),
      ).toEqual([
        { code: 'P1', label: '1' },
        { code: 'P2', label: '2' },
        { code: 'P3', label: '3' },
        { code: 'P4', label: '4' },
        { code: 'P5', label: '5' },
      ])
    })

    it('overrides predefined point labels with author captions by matching code', () => {
      const captions: Record<string, string> = { P1: 'Awful', P3: 'Neutral' }
      expect(
        buildAnswerOptionsForQuestion<{ code: string }>(
          {
            type: 'starRating',
            answerOptions: [
              { code: 'P1' },
              { code: 'P2' },
              { code: 'P3' },
              { code: 'P4' },
              { code: 'P5' },
            ],
          },
          (ao) => captions[ao.code],
        ),
      ).toEqual([
        { code: 'P1', label: 'Awful' },
        { code: 'P2', label: '2' },
        { code: 'P3', label: 'Neutral' },
        { code: 'P4', label: '4' },
        { code: 'P5', label: '5' },
      ])
    })
  })

  describe('buildPredefinedAnswerOptionLiterals', () => {
    it('builds a token-to-literal map across all predefined-option questions', () => {
      const questionsInfo: QuestionInfo[] = [
        { code: 'Q001', type: 'yesNo', position: 0 },
        { code: 'Q002', type: 'point5', position: 1 },
        { code: 'Q003', type: 'checkbox', position: 2 },
      ]

      const literals = buildPredefinedAnswerOptionLiterals(questionsInfo)

      expect(literals['answers.Q001.YES']).toBe('true')
      expect(literals['answers.Q001.NO']).toBe('false')
      expect(literals['answers.Q002.P1']).toBe('1')
      expect(literals['answers.Q002.P5']).toBe('5')
      expect(Object.keys(literals)).not.toContain('answers.Q003.A001')
    })
  })
})
