import { useCallback } from 'react'
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import type { SurveyAnswerOption, SurveySubquestion } from 'veysur-common'

import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

interface UseDragAndDropOptions {
  questionId: string
  subquestions: SurveySubquestion[]
  answerOptions: SurveyAnswerOption[]
  isSubquestionsAsRows: boolean
}

export const useDragAndDrop = ({
  questionId,
  subquestions,
  answerOptions,
  isSubquestionsAsRows,
}: UseDragAndDropOptions) => {
  const operations = useSurveyEditorStore((state) => state.operations)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 0.9 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  const colIds = isSubquestionsAsRows
    ? answerOptions.map((ao) => `col:${ao._id}`)
    : subquestions.map((sq) => `col:${sq._id}`)

  const rowIds = isSubquestionsAsRows
    ? subquestions.map((sq) => `row:${sq._id}`)
    : answerOptions.map((ao) => `row:${ao._id}`)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const activeId = active.id as string
      const overId = over.id as string

      if (activeId.startsWith('col:') && overId.startsWith('col:')) {
        if (isSubquestionsAsRows) {
          const newIndex = answerOptions.findIndex(
            (ao) => ao._id === overId.slice(4),
          )
          if (newIndex !== -1)
            operations?.moveAnswerOption?.(
              questionId,
              activeId.slice(4),
              newIndex,
            )
        } else {
          const newIndex = subquestions.findIndex(
            (sq) => sq._id === overId.slice(4),
          )
          if (newIndex !== -1)
            operations?.moveSubquestion?.(
              questionId,
              activeId.slice(4),
              newIndex,
            )
        }
      } else if (activeId.startsWith('row:') && overId.startsWith('row:')) {
        if (isSubquestionsAsRows) {
          const newIndex = subquestions.findIndex(
            (sq) => sq._id === overId.slice(4),
          )
          if (newIndex !== -1)
            operations?.moveSubquestion?.(
              questionId,
              activeId.slice(4),
              newIndex,
            )
        } else {
          const newIndex = answerOptions.findIndex(
            (ao) => ao._id === overId.slice(4),
          )
          if (newIndex !== -1)
            operations?.moveAnswerOption?.(
              questionId,
              activeId.slice(4),
              newIndex,
            )
        }
      }
    },
    [questionId, operations, subquestions, answerOptions, isSubquestionsAsRows],
  )

  return { sensors, handleDragEnd, colIds, rowIds }
}
