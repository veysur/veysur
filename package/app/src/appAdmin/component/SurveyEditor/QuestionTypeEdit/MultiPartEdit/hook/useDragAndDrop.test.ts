import { renderHook, act } from '@testing-library/react'
import { DragEndEvent } from '@dnd-kit/core'
import type { SurveySubquestion } from 'veysur-common'

import { useDragAndDrop } from './useDragAndDrop'

const moveSubquestion = jest.fn()
const addSubquestion = jest.fn()

jest.mock('appAdmin/component/SurveyEditor', () => ({
  useSurveyEditorStore: (
    selector: (state: {
      operations: {
        moveSubquestion: typeof moveSubquestion
        addSubquestion: typeof addSubquestion
      }
    }) => unknown,
  ) =>
    selector({
      operations: { moveSubquestion, addSubquestion },
    }),
}))

const buildParts = (): SurveySubquestion[] =>
  [
    { _id: 'p1', code: 'PART1' },
    { _id: 'p2', code: 'PART2' },
    { _id: 'p3', code: 'PART3' },
  ] as unknown as SurveySubquestion[]

const dragEndEvent = (activeId: string, overId: string | null) =>
  ({
    active: { id: activeId },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent

describe('MultiPartEdit useDragAndDrop', () => {
  beforeEach(() => {
    moveSubquestion.mockClear()
    addSubquestion.mockClear()
  })

  it('handleDragEnd calls operations.moveSubquestion with the reordered index', () => {
    const parts = buildParts()
    const { result } = renderHook(() =>
      useDragAndDrop({ questionId: 'q1', parts }),
    )

    act(() => {
      result.current.handleDragEnd(dragEndEvent('row:p1', 'row:p3'))
    })

    expect(moveSubquestion).toHaveBeenCalledWith('q1', 'p1', 2)
  })

  it('handleDragEnd is a no-op when over is null', () => {
    const parts = buildParts()
    const { result } = renderHook(() =>
      useDragAndDrop({ questionId: 'q1', parts }),
    )

    act(() => {
      result.current.handleDragEnd(dragEndEvent('row:p1', null))
    })

    expect(moveSubquestion).not.toHaveBeenCalled()
  })

  it('handleDragEnd is a no-op when the drop position is unchanged', () => {
    const parts = buildParts()
    const { result } = renderHook(() =>
      useDragAndDrop({ questionId: 'q1', parts }),
    )

    act(() => {
      result.current.handleDragEnd(dragEndEvent('row:p1', 'row:p1'))
    })

    expect(moveSubquestion).not.toHaveBeenCalled()
  })

  it('handleAddPart calls operations.addSubquestion for the given questionId', () => {
    const parts = buildParts()
    const { result } = renderHook(() =>
      useDragAndDrop({ questionId: 'q1', parts }),
    )

    act(() => {
      result.current.handleAddPart()
    })

    expect(addSubquestion).toHaveBeenCalledWith('q1')
  })
})
