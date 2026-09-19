import { renderHook } from '@testing-library/react'
import { Survey, QuestionInfo } from 'veysur-common'

import { useQuestionPositionAvailability } from './useQuestionPositionAvailability'

describe('useQuestionPositionAvailability', () => {
  const survey = new Survey({
    _id: 's1',
    sections: [
      { _id: 'g1', code: 'G1', name: { en: 'Group 1' } },
      { _id: 'g2', code: 'G2', name: { en: 'Group 2' } },
    ],
    sectionIds: ['g1', 'g2'],
    elements: [
      {
        _id: 'q1',
        sectionId: 'g1',
        code: 'Q001',
        type: 'text',
        text: { en: 'Q1' },
      },
      {
        _id: 'q2',
        sectionId: 'g1',
        code: 'Q002',
        type: 'text',
        text: { en: 'Q2' },
      },
      {
        _id: 'q3',
        sectionId: 'g2',
        code: 'Q003',
        type: 'text',
        text: { en: 'Q3' },
      },
    ],
  })

  const questionsInfo: QuestionInfo[] = [
    { code: 'Q001', type: 'text', position: 0 },
    { code: 'Q002', type: 'text', position: 1 },
    { code: 'Q003', type: 'text', position: 2 },
  ]

  const questionByCode = (code: string) =>
    survey.elements.getQuestionByCode(code)!
  const groupById = (id: string) =>
    survey.sections.groups().find((g) => g._id === id)!

  it('returns position 0 and every question when entity is null', () => {
    const { result } = renderHook(() =>
      useQuestionPositionAvailability(survey, null, questionsInfo),
    )
    expect(result.current.currentPosition).toBe(0)
    expect(result.current.availableQuestions).toEqual(questionsInfo)
  })

  it('scopes to questions strictly before a mid-survey question', () => {
    const { result } = renderHook(() =>
      useQuestionPositionAvailability(
        survey,
        questionByCode('Q003'),
        questionsInfo,
      ),
    )
    expect(result.current.currentPosition).toBe(2)
    expect(result.current.availableQuestions.map((q) => q.code)).toEqual([
      'Q001',
      'Q002',
    ])
  })

  it('scopes to questions from preceding groups for a group entity', () => {
    const { result } = renderHook(() =>
      useQuestionPositionAvailability(survey, groupById('g2'), questionsInfo),
    )
    expect(result.current.currentPosition).toBe(2)
    expect(result.current.availableQuestions.map((q) => q.code)).toEqual([
      'Q001',
      'Q002',
    ])
  })

  it('returns 0/[] for the first group (no preceding questions)', () => {
    const { result } = renderHook(() =>
      useQuestionPositionAvailability(survey, groupById('g1'), questionsInfo),
    )
    expect(result.current.currentPosition).toBe(0)
    expect(result.current.availableQuestions).toEqual([])
  })

  it("returns every question for the 'end' entity", () => {
    const { result } = renderHook(() =>
      useQuestionPositionAvailability(survey, 'end', questionsInfo),
    )
    expect(result.current.currentPosition).toBe(3)
    expect(result.current.availableQuestions).toEqual(questionsInfo)
  })
})
