import { renderHook } from '@testing-library/react'

import { usePointScaleLabelHandler } from './usePointScaleLabelHandler'

const updateAnswerOptionLabel = jest.fn()

jest.mock('appAdmin/component/SurveyEditor', () => ({
  useSurveyEditorStore: (
    selector: (state: {
      operations: { updateAnswerOptionLabel: typeof updateAnswerOptionLabel }
      langEditing: string
    }) => unknown,
  ) => selector({ operations: { updateAnswerOptionLabel }, langEditing: 'fr' }),
}))

describe('usePointScaleLabelHandler', () => {
  beforeEach(() => {
    updateAnswerOptionLabel.mockClear()
  })

  it('calls updateAnswerOptionLabel with the exact arg order/values', () => {
    const { result } = renderHook(() => usePointScaleLabelHandler('q1', 'en'))

    result.current('a1', 'New label')

    expect(updateAnswerOptionLabel).toHaveBeenCalledWith(
      'q1',
      'a1',
      'New label',
      'fr',
      'en',
    )
  })
})
