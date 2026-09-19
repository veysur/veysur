import { useCallback } from 'react'
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import type { SurveySubquestion } from 'veysur-common'

import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

interface UseDragAndDropOptions {
  questionId: string
  parts: SurveySubquestion[]
}

/**
 * Single-axis drag-and-drop for Multi-Part parts — the trimmed sibling of
 * MatrixEdit's `useDragAndDrop`, which couples two axes (rows and columns).
 * Multi-Part has only one axis (parts), so there is no column concept here.
 */
export const useDragAndDrop = ({
  questionId,
  parts,
}: UseDragAndDropOptions) => {
  const operations = useSurveyEditorStore((state) => state.operations)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 0.9 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  const rowIds = parts.map((part) => `row:${part._id}`)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const activeId = active.id as string
      const overId = over.id as string

      if (activeId.startsWith('row:') && overId.startsWith('row:')) {
        const newIndex = parts.findIndex((part) => part._id === overId.slice(4))
        if (newIndex !== -1) {
          operations?.moveSubquestion?.(questionId, activeId.slice(4), newIndex)
        }
      }
    },
    [questionId, operations, parts],
  )

  const handleAddPart = useCallback(
    () => operations?.addSubquestion?.(questionId),
    [operations, questionId],
  )

  return { sensors, handleDragEnd, rowIds, handleAddPart }
}
