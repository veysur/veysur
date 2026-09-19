import { renderHook, act } from '@testing-library/react'
import { Survey, L10n } from 'veysur-common'

import { useSurveyEditorStore } from './useSurveyEditorStore'
import { useStructuralChangeGuard } from './useStructuralChangeGuard'

describe('useStructuralChangeGuard', () => {
  const surveyWithReferencedOption = () =>
    new Survey({
      _id: 's1',
      sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
      elements: [
        {
          _id: 'q1',
          sectionId: 'g1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Q1' },
          answerOptions: [
            { _id: 'a1', code: 'A001', label: new L10n({ en: 'A1' }) },
          ],
        },
        {
          _id: 'q2',
          sectionId: 'g1',
          code: 'Q002',
          text: { en: 'Q2' },
          condition: 'response.Q001.A001',
          conditionReferences: ['Q001.A001'],
        },
      ],
    })

  beforeEach(() => {
    useSurveyEditorStore.getState().setSurvey(undefined)
  })

  it('commits immediately when the change is not impacted', () => {
    useSurveyEditorStore.getState().setSurvey(surveyWithReferencedOption())
    const { result } = renderHook(() => useStructuralChangeGuard())

    const commit = jest.fn()
    act(() => {
      result.current.guardAnswerOptionRemoval('q1', 'A999', commit)
    })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(result.current.dialogState.open).toBe(false)
  })

  it('stashes a confirm dialog when the change is impacted', () => {
    useSurveyEditorStore.getState().setSurvey(surveyWithReferencedOption())
    const { result } = renderHook(() => useStructuralChangeGuard())

    const commit = jest.fn()
    act(() => {
      result.current.guardAnswerOptionRemoval('q1', 'A001', commit)
    })

    expect(commit).not.toHaveBeenCalled()
    expect(result.current.dialogState.open).toBe(true)
    expect(result.current.dialogState.message).toMatch(/Q001\.A001/)

    act(() => {
      result.current.dialogState.onConfirm()
    })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(result.current.dialogState.open).toBe(false)
  })
})
