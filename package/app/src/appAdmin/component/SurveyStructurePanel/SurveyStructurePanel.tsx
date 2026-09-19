import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { List as ListIcon, Eye, EyeOff } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  pointerWithin,
  CollisionDetection,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Virtuoso } from 'react-virtuoso'

import { SurveySection } from 'veysur-common'

import { ListGroup } from 'component/shadcn/list-group'
import { Badge } from 'component/shadcn/badge'
import { Button } from 'component/shadcn/button'
import { Separator } from 'component/shadcn/separator'
import {
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_SECTION,
} from 'appAdmin/component/SurveyEditor'
import { useSidebar } from 'component/shadcn/sidebar'

import { QuestionGroupItemView } from './QuestionGroupItemView'
import { QuestionGroupQuestionsList } from './QuestionGroupQuestionsList'
import { QuestionItemView } from './QuestionItemView'
import { SurveyTitleItemView } from './SurveyTitleItemView'
import { SurveyWelcomeItemView } from './SurveyWelcomeItemView'
import { SurveyThankYouItemView } from './SurveyThankYouItemView'
import { useDragAndDrop } from './hook'
import { toGroupDndId } from './hook/dndId'

// handleDragOver reorders `arrangement` on every pointer move, which re-renders the
// virtualized group/question lists mid-drag. dnd-kit's default WhileDragging strategy
// keeps re-measuring every sortable/droppable rect for the duration of the drag, so
// those Virtuoso-triggered layout changes and dnd-kit's own remeasurement feed back into
// each other within a single commit and exceed React's 50-nested-update budget (error
// #185) — reproducible only while dragging, never via the non-drag move actions.
// Measuring once at drag start removes the continuous remeasurement side of that loop.
const MEASURING_CONFIG = {
  droppable: { strategy: MeasuringStrategy.BeforeDragging },
}

export const SurveyStructurePanel: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const operations = useSurveyEditorStore((state) => state.operations)
  const showQuestionDetails = useSurveyEditorStore(
    (state) => state.uiPrefs.showQuestionDetails,
  )
  const setShowQuestionDetails = useSurveyEditorStore(
    (state) => state.setShowQuestionDetails,
  )
  const collapsedGroups = useSurveyEditorStore(
    (state) => state.uiPrefs.collapsedGroups,
  )
  const setCollapsedGroups = useSurveyEditorStore(
    (state) => state.setCollapsedGroups,
  )
  const isDraggingRef = useRef(false)
  const { setOpenMobile } = useSidebar()
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const findScrollParent = () => {
      const container = document.getElementById('survey-structure-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        if (rect.height > 0 && rect.width > 0) {
          setScrollParent(container)
        }
      }
    }

    const rafId = requestAnimationFrame(() => {
      // Add a small timeout to ensure layout is complete on page reload
      setTimeout(findScrollParent, 50)
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])

  const elementsById = useMemo(
    () => new Map((survey?.elements ?? []).map((el) => [el._id, el])),
    [survey],
  )

  const toggleGroupCollapse = useCallback(
    (groupId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      const newSet = new Set(collapsedGroups)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      setCollapsedGroups(newSet)
    },
    [collapsedGroups, setCollapsedGroups],
  )

  const {
    arrangement,
    activeDrag,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useDragAndDrop(survey, operations)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    return pointerCollisions.length > 0
      ? pointerCollisions
      : closestCenter(args)
  }

  if (!survey) {
    return null
  }

  const handleDragStartWrapper = (event: DragStartEvent) => {
    isDraggingRef.current = true
    handleDragStart(event)
  }

  const handleDragEndWrapper = (event: DragEndEvent) => {
    handleDragEnd(event)
    setTimeout(() => {
      isDraggingRef.current = false
    }, 0)
  }

  const handleContainerClick = () => {
    if (!isDraggingRef.current) {
      setOpenMobile(false)
    }
  }

  const groupOrder =
    arrangement?.groupOrder || survey.sections.groups().map((g) => g._id)

  const getGroup = (groupId: string): SurveySection | undefined =>
    survey.sections.groups().find((g) => g._id === groupId)

  const getGroupQuestions = (groupId: string) => {
    if (arrangement) {
      return (arrangement.questionsByGroup[groupId] || [])
        .map((id) => elementsById.get(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q))
    }
    return survey.elements.getBySectionId(groupId)
  }

  const renderCollapsibleQuestionGroup = (groupId: string) => {
    const group = getGroup(groupId)
    if (!group) return null

    const questions = getGroupQuestions(groupId)
    const isCollapsed = collapsedGroups.has(group._id)

    return (
      <div
        key={group._id}
        className="question-group-container"
        data-testid="section-container"
      >
        <QuestionGroupItemView
          questionGroup={group}
          questions={questions}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleGroupCollapse}
          showQuestionCount={true}
          showQuestionDetails={showQuestionDetails}
        />
        {!isCollapsed && (
          <QuestionGroupQuestionsList
            questionGroup={group}
            questions={questions}
            showQuestionDetails={showQuestionDetails}
          />
        )}
      </div>
    )
  }

  const getDragOverlayContent = () => {
    if (!activeDrag) return null

    if (activeDrag.type === SURVEY_ENTITY_TYPE_SECTION) {
      const group = getGroup(activeDrag.sectionId)
      if (group) {
        const questions = getGroupQuestions(group._id)
        return (
          <QuestionGroupItemView
            questionGroup={group}
            questions={questions}
            isCollapsed={true}
            onToggleCollapse={() => {}}
            showQuestionCount={true}
            showQuestionDetails={showQuestionDetails}
            isDragOverlay={true}
          />
        )
      }
    } else {
      const question = survey.elements.find(
        (q) => q._id === activeDrag.questionId,
      )
      const group = question?.sectionId
        ? getGroup(question.sectionId)
        : undefined

      if (group && question) {
        return (
          <QuestionItemView
            questionGroup={group}
            question={question}
            showQuestionDetails={showQuestionDetails}
            isDragOverlay={true}
          />
        )
      }
    }

    return null
  }

  const totalQuestions = survey?.elements.questions()?.length || 0
  const totalGroups = survey?.sections.groups()?.length || 0

  return (
    <div className="mb-30">
      <div className="px-2 py-3">
        <h4 className="text-sm font-semibold mb-3">Structure</h4>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {totalGroups} {totalGroups === 1 ? 'Group' : 'Groups'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <ListIcon className="mr-1 h-3 w-3" />
              {totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuestionDetails(!showQuestionDetails)}
            className="h-7 w-7 p-0"
            title={
              showQuestionDetails
                ? 'Hide question details'
                : 'Show question details'
            }
          >
            {showQuestionDetails ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div onClick={handleContainerClick}>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={MEASURING_CONFIG}
          onDragStart={handleDragStartWrapper}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEndWrapper}
          onDragCancel={handleDragCancel}
        >
          <ListGroup>
            <SurveyTitleItemView survey={survey} />
            <SurveyWelcomeItemView survey={survey} />
          </ListGroup>

          <SortableContext
            items={groupOrder.map(toGroupDndId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="survey-groups">
              {scrollParent && (
                <Virtuoso
                  customScrollParent={scrollParent}
                  data={groupOrder}
                  increaseViewportBy={{ top: 200, bottom: 200 }}
                  defaultItemHeight={200}
                  itemContent={(_index, groupId) =>
                    renderCollapsibleQuestionGroup(groupId)
                  }
                />
              )}
            </div>
          </SortableContext>

          <ListGroup>
            <SurveyThankYouItemView survey={survey} />
          </ListGroup>

          <DragOverlay dropAnimation={{ duration: 200 }}>
            {getDragOverlayContent()}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
