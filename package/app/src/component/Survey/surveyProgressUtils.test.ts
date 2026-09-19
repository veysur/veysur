import { createProgressUtils, isQuestionAnswered } from './surveyProgressUtils'
import type { QuestionWithGroup } from './SurveyTypes'

describe('isQuestionAnswered', () => {
  test.each([
    ['undefined', undefined, false],
    ['null', null, false],
    ['empty string', '', false],
    ['whitespace-only string', '   ', false],
    ['non-empty string', 'yes', true],
    ['number zero', 0, true],
    ['boolean false', false, true],
    ['boolean true', true, true],
    ['empty array', [], false],
    ['non-empty array', ['A001'], true],
    ['empty object', {}, false],
    ['multiple-choice object', { A001: true }, true],
    ['partially-filled matrix object', { sub1: 'a', sub2: '' }, true],
  ])('%s -> %s', (_label, value, expected) => {
    expect(isQuestionAnswered(value)).toBe(expected)
  })
})

const makeQuestion = (code: string): QuestionWithGroup =>
  ({
    question: { code },
    group: { _id: 'group-1' },
  }) as unknown as QuestionWithGroup

describe('createProgressUtils', () => {
  test('0 of N answered -> 0%', () => {
    const visibleQuestions = [makeQuestion('Q1'), makeQuestion('Q2')]
    const { getTotalItems, getAnsweredCount, getProgressPercentage } =
      createProgressUtils(visibleQuestions, {})

    expect(getTotalItems()).toBe(2)
    expect(getAnsweredCount()).toBe(0)
    expect(getProgressPercentage()).toBe(0)
  })

  test('partial answers, including falsy-but-meaningful values, count correctly', () => {
    const visibleQuestions = [
      makeQuestion('Q1'),
      makeQuestion('Q2'),
      makeQuestion('Q3'),
      makeQuestion('Q4'),
      makeQuestion('Q5'),
      makeQuestion('Q6'),
      makeQuestion('Q7'),
      makeQuestion('Q8'),
      makeQuestion('Q9'),
      makeQuestion('Q10'),
    ]
    const answers = {
      Q1: 'answered',
      Q2: false,
      Q3: 0,
      Q4: '',
      Q5: undefined,
    }
    const { getAnsweredCount, getProgressPercentage } = createProgressUtils(
      visibleQuestions,
      answers,
    )

    expect(getAnsweredCount()).toBe(3)
    expect(getProgressPercentage()).toBe(30)
  })

  test('all answered -> 100%', () => {
    const visibleQuestions = [makeQuestion('Q1'), makeQuestion('Q2')]
    const answers = { Q1: 'a', Q2: 'b' }
    const { getProgressPercentage } = createProgressUtils(
      visibleQuestions,
      answers,
    )

    expect(getProgressPercentage()).toBe(100)
  })

  test('empty visibleQuestions -> no divide-by-zero', () => {
    const { getTotalItems, getProgressPercentage } = createProgressUtils([], {})

    expect(getTotalItems()).toBe(0)
    expect(getProgressPercentage()).toBe(0)
  })

  test('answers for questions not in visibleQuestions do not inflate the count', () => {
    const visibleQuestions = [makeQuestion('Q1')]
    const answers = { Q1: undefined, HiddenQuestion: 'answered' }
    const { getAnsweredCount } = createProgressUtils(visibleQuestions, answers)

    expect(getAnsweredCount()).toBe(0)
  })
})
