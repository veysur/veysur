import { renderHook, act } from '@testing-library/react'
import { Survey } from 'veysur-common'
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'

import type { createSurveyOperations } from 'appAdmin/component/SurveyEditor'

import { useDragAndDrop } from './useDragAndDrop'
import { toGroupDndId, toQuestionDndId, toGroupContainerDndId } from './dndId'

const buildSurvey = () =>
  new Survey({
    _id: 's1',
    sections: [
      { _id: 'g1', code: 'G001', name: { en: 'Group G001' } },
      { _id: 'g2', code: 'G002', name: { en: 'Group G002' } },
      { _id: 'g3', code: 'G003', name: { en: 'Group G003' } },
    ],
    sectionIds: ['g1', 'g2', 'g3'],
    elements: [
      { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q1' } },
      { _id: 'q2', sectionId: 'g2', code: 'Q002', text: { en: 'Q2' } },
      { _id: 'q3', sectionId: 'g3', code: 'Q003', text: { en: 'Q3' } },
    ],
  })

const dragStartEvent = (activeId: string) =>
  ({
    active: { id: activeId },
  }) as unknown as DragStartEvent

const dragOverEvent = (activeId: string, overId: string) =>
  ({
    active: { id: activeId },
    over: { id: overId },
  }) as unknown as DragOverEvent

const dragEndEvent = (activeId: string, overId?: string) =>
  ({
    active: { id: activeId },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent

const setupOperations = () => {
  const moveQuestion = jest.fn()
  const moveSection = jest.fn()
  const operations = {
    moveQuestion,
    moveSection,
  } as unknown as ReturnType<typeof createSurveyOperations>
  return { operations, moveQuestion, moveSection }
}

describe('useDragAndDrop', () => {
  it('commits a question into the group whose header the preview shows it above', () => {
    const survey = buildSurvey()
    const { operations, moveQuestion } = setupOperations()

    const { result } = renderHook(() => useDragAndDrop(survey, operations))

    act(() => {
      result.current.handleDragStart(dragStartEvent(toQuestionDndId('q3')))
    })
    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toQuestionDndId('q3'), toGroupDndId('g2')),
      )
    })
    act(() => {
      result.current.handleDragEnd(
        dragEndEvent(toQuestionDndId('q3'), toGroupDndId('g2')),
      )
    })

    // Hovering group g2's header previews q3 above g2 (i.e. inside g2 at
    // index 0) — the commit must land q3 in g2, not g1 or g3.
    expect(moveQuestion).toHaveBeenCalledWith('q3', 'g2', 1)
  })

  it('updates the local arrangement incrementally across group boundaries, committing only the final position', () => {
    const survey = buildSurvey()
    const { operations, moveQuestion } = setupOperations()

    const { result } = renderHook(() => useDragAndDrop(survey, operations))

    act(() => {
      result.current.handleDragStart(dragStartEvent(toQuestionDndId('q1')))
    })
    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toQuestionDndId('q1'), toGroupDndId('g2')),
      )
    })
    expect(result.current.arrangement?.questionsByGroup.g2).toEqual([
      'q1',
      'q2',
    ])

    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toQuestionDndId('q1'), toGroupDndId('g3')),
      )
    })
    expect(result.current.arrangement?.questionsByGroup.g2).toEqual(['q2'])
    expect(result.current.arrangement?.questionsByGroup.g3).toEqual([
      'q1',
      'q3',
    ])

    act(() => {
      result.current.handleDragEnd(
        dragEndEvent(toQuestionDndId('q1'), toGroupDndId('g3')),
      )
    })

    expect(moveQuestion).toHaveBeenCalledTimes(1)
    expect(moveQuestion).toHaveBeenCalledWith('q1', 'g3', 1)
  })

  it('drops onto an empty group container at index 0', () => {
    const survey = new Survey({
      _id: 's1',
      sections: [
        { _id: 'g1', code: 'G001', name: { en: 'Group G001' } },
        { _id: 'g2', code: 'G002', name: { en: 'Group G002' } },
      ],
      sectionIds: ['g1', 'g2'],
      elements: [
        { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q1' } },
      ],
    })
    const { operations, moveQuestion } = setupOperations()

    const { result } = renderHook(() => useDragAndDrop(survey, operations))

    act(() => {
      result.current.handleDragStart(dragStartEvent(toQuestionDndId('q1')))
    })
    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toQuestionDndId('q1'), toGroupContainerDndId('g2')),
      )
    })
    act(() => {
      result.current.handleDragEnd(
        dragEndEvent(toQuestionDndId('q1'), toGroupContainerDndId('g2')),
      )
    })

    expect(moveQuestion).toHaveBeenCalledWith('q1', 'g2', 0)
  })

  it('reorders groups when dragging a group header onto another', () => {
    const survey = buildSurvey()
    const { operations, moveSection } = setupOperations()

    const { result } = renderHook(() => useDragAndDrop(survey, operations))

    act(() => {
      result.current.handleDragStart(dragStartEvent(toGroupDndId('g3')))
    })
    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toGroupDndId('g3'), toGroupDndId('g1')),
      )
    })
    act(() => {
      result.current.handleDragEnd(
        dragEndEvent(toGroupDndId('g3'), toGroupDndId('g1')),
      )
    })

    expect(moveSection).toHaveBeenCalledWith('g3', 0)
  })

  it('does not commit when the drop lands back at the original position', () => {
    const survey = buildSurvey()
    const { operations, moveQuestion, moveSection } = setupOperations()

    const { result } = renderHook(() => useDragAndDrop(survey, operations))

    act(() => {
      result.current.handleDragStart(dragStartEvent(toQuestionDndId('q1')))
    })
    act(() => {
      result.current.handleDragEnd(dragEndEvent(toQuestionDndId('q1')))
    })

    expect(moveQuestion).not.toHaveBeenCalled()
    expect(moveSection).not.toHaveBeenCalled()
  })

  it('does not commit when a question is dragged away and released back at its origin', () => {
    const survey = buildSurvey()
    const { operations, moveQuestion } = setupOperations()

    const { result } = renderHook(() => useDragAndDrop(survey, operations))

    act(() => {
      result.current.handleDragStart(dragStartEvent(toQuestionDndId('q1')))
    })
    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toQuestionDndId('q1'), toGroupDndId('g2')),
      )
    })
    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toQuestionDndId('q1'), toGroupDndId('g1')),
      )
    })
    act(() => {
      result.current.handleDragEnd(
        dragEndEvent(toQuestionDndId('q1'), toGroupDndId('g1')),
      )
    })

    expect(moveQuestion).not.toHaveBeenCalled()
  })

  it('clears drag state on cancel without committing', () => {
    const survey = buildSurvey()
    const { operations, moveQuestion } = setupOperations()

    const { result } = renderHook(() => useDragAndDrop(survey, operations))

    act(() => {
      result.current.handleDragStart(dragStartEvent(toQuestionDndId('q1')))
    })
    act(() => {
      result.current.handleDragOver(
        dragOverEvent(toQuestionDndId('q1'), toGroupDndId('g2')),
      )
    })
    act(() => {
      result.current.handleDragCancel()
    })

    expect(moveQuestion).not.toHaveBeenCalled()
    expect(result.current.arrangement).toBeNull()
    expect(result.current.activeDrag).toBeNull()
  })
})
