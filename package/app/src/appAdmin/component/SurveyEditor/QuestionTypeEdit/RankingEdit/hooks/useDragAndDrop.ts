import { useState } from 'react'
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SurveyQuestion } from 'veysur-common'

import { createSurveyOperations } from 'appAdmin/component/SurveyEditor'

export const useDragAndDrop = (
  question: SurveyQuestion,
  moveAnswerOption?: ReturnType<
    typeof createSurveyOperations
  >['moveAnswerOption'],
) => {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setDraggingId(active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      resetDragState()
      return
    }
    handleDrag(active.id as string, over.id as string)
    resetDragState()
  }

  const handleDrag = (draggingId: string, overId: string) => {
    const newIndex = question?.answerOptions?.findIndex(
      (answerOption) => answerOption._id === overId,
    )
    if (moveAnswerOption && newIndex !== undefined && newIndex !== -1) {
      moveAnswerOption(question._id, draggingId, newIndex)
    }
  }

  const resetDragState = () => {
    setDraggingId(null)
  }

  return {
    draggingId,
    handleDragStart,
    handleDragEnd,
  }
}
