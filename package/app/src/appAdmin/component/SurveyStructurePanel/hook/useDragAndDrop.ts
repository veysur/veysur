import { useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { Survey } from 'veysur-common'

import {
  createSurveyOperations,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
} from 'appAdmin/component/SurveyEditor'

import {
  fromGroupDndId,
  fromQuestionDndId,
  fromGroupContainerDndId,
} from './dndId'

export type DragArrangement = {
  groupOrder: string[]
  questionsByGroup: Record<string, string[]>
}

export type ActiveDrag =
  | { type: typeof SURVEY_ENTITY_TYPE_SECTION; sectionId: string }
  | { type: typeof SURVEY_ENTITY_TYPE_ELEMENT; questionId: string }

const buildArrangementFromSurvey = (survey: Survey): DragArrangement => {
  const groupOrder = survey.sections.groups().map((group) => group._id)
  const questionsByGroup: Record<string, string[]> = {}
  groupOrder.forEach((groupId) => {
    // Mixed element list (questions + content), in element order.
    questionsByGroup[groupId] = survey.elements
      .getBySectionId(groupId)
      .map((element) => element._id)
  })
  return { groupOrder, questionsByGroup }
}

const findQuestionGroup = (
  arrangement: DragArrangement,
  questionId: string,
): string | null => {
  return (
    arrangement.groupOrder.find((groupId) =>
      arrangement.questionsByGroup[groupId]?.includes(questionId),
    ) || null
  )
}

const flattenQuestionOrder = (arrangement: DragArrangement): string[] =>
  arrangement.groupOrder.flatMap(
    (groupId) => arrangement.questionsByGroup[groupId] || [],
  )

export const useDragAndDrop = (
  survey: Survey | undefined,
  operations?: ReturnType<typeof createSurveyOperations>,
) => {
  const [arrangement, setArrangement] = useState<DragArrangement | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const startArrangementRef = useRef<DragArrangement | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    if (!survey) return

    const id = String(event.active.id)
    const groupId = fromGroupDndId(id)
    const questionId = fromQuestionDndId(id)

    if (groupId) {
      setActiveDrag({ type: SURVEY_ENTITY_TYPE_SECTION, sectionId: groupId })
    } else if (questionId) {
      setActiveDrag({ type: SURVEY_ENTITY_TYPE_ELEMENT, questionId })
    } else {
      return
    }

    const startArrangement = buildArrangementFromSurvey(survey)
    startArrangementRef.current = startArrangement
    setArrangement(startArrangement)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over || !arrangement || !activeDrag) return

    if (activeDrag.type === SURVEY_ENTITY_TYPE_SECTION) {
      const overGroupId = fromGroupDndId(String(over.id))
      if (!overGroupId || overGroupId === activeDrag.sectionId) return

      const oldIndex = arrangement.groupOrder.indexOf(activeDrag.sectionId)
      const newIndex = arrangement.groupOrder.indexOf(overGroupId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      setArrangement({
        ...arrangement,
        groupOrder: arrayMove(arrangement.groupOrder, oldIndex, newIndex),
      })
      return
    }

    const questionId = activeDrag.questionId
    const sourceGroupId = findQuestionGroup(arrangement, questionId)
    if (!sourceGroupId) return

    const overGroupId = fromGroupDndId(String(over.id))
    const overContainerGroupId = fromGroupContainerDndId(String(over.id))
    const overQuestionId = fromQuestionDndId(String(over.id))

    let targetGroupId: string | null
    let targetIndex: number

    if (overGroupId) {
      targetGroupId = overGroupId
      targetIndex = 0
    } else if (overContainerGroupId) {
      targetGroupId = overContainerGroupId
      targetIndex =
        arrangement.questionsByGroup[overContainerGroupId]?.length ?? 0
    } else if (overQuestionId) {
      targetGroupId = findQuestionGroup(arrangement, overQuestionId)
      if (!targetGroupId) return
      const targetList = arrangement.questionsByGroup[targetGroupId] || []
      targetIndex = targetList.indexOf(overQuestionId)
      if (targetIndex === -1) targetIndex = targetList.length
    } else {
      return
    }

    const sourceList = (
      arrangement.questionsByGroup[sourceGroupId] || []
    ).filter((id) => id !== questionId)
    const targetList =
      sourceGroupId === targetGroupId
        ? sourceList
        : (arrangement.questionsByGroup[targetGroupId] || []).slice()

    const clampedIndex = Math.min(Math.max(targetIndex, 0), targetList.length)

    const currentTargetIndex =
      arrangement.questionsByGroup[sourceGroupId]?.indexOf(questionId)
    if (
      sourceGroupId === targetGroupId &&
      currentTargetIndex === clampedIndex
    ) {
      return
    }

    targetList.splice(clampedIndex, 0, questionId)

    setArrangement({
      ...arrangement,
      questionsByGroup: {
        ...arrangement.questionsByGroup,
        [sourceGroupId]: sourceList,
        [targetGroupId]: targetList,
      },
    })
  }

  // Commits are computed entirely from `arrangement`/`activeDrag` (already
  // kept in sync by onDragOver), so the event itself carries no information
  // this handler needs — accepting it only matches DndContext's callback
  // signature.
  const handleDragEnd = (event: DragEndEvent) => {
    void event
    commitArrangement()
    resetDragState()
  }

  const handleDragCancel = () => {
    resetDragState()
  }

  const commitArrangement = () => {
    if (!survey || !arrangement || !activeDrag) return
    const startArrangement = startArrangementRef.current
    if (!startArrangement) return

    if (activeDrag.type === SURVEY_ENTITY_TYPE_SECTION) {
      if (
        JSON.stringify(arrangement.groupOrder) ===
        JSON.stringify(startArrangement.groupOrder)
      ) {
        return
      }
      const newIndex = arrangement.groupOrder.indexOf(activeDrag.sectionId)
      if (newIndex === -1) return
      operations?.moveSection(activeDrag.sectionId, newIndex)
      return
    }

    const questionId = activeDrag.questionId
    if (
      JSON.stringify(arrangement.questionsByGroup) ===
      JSON.stringify(startArrangement.questionsByGroup)
    ) {
      return
    }

    const targetGroupId = findQuestionGroup(arrangement, questionId)
    if (!targetGroupId) return

    const flatOrder = flattenQuestionOrder(arrangement)
    const newIndex = flatOrder.indexOf(questionId)
    if (newIndex === -1) return

    const isContent = survey.contents.some((c) => c._id === questionId)
    if (isContent) {
      operations?.moveContent(questionId, targetGroupId, newIndex)
    } else {
      operations?.moveQuestion(questionId, targetGroupId, newIndex)
    }
  }

  const resetDragState = () => {
    setArrangement(null)
    setActiveDrag(null)
    startArrangementRef.current = null
  }

  return {
    arrangement,
    activeDrag,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  }
}
