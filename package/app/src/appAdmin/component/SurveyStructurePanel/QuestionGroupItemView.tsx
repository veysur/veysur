import React from 'react'
import { Layers, ChevronDown, ChevronRight } from 'lucide-react'
import { SurveySection, SurveyElementBase } from 'veysur-common'

import { Badge } from 'component/shadcn/badge'
import { ListGroupItem } from 'component/shadcn/list-group'
import { stripHtml } from 'common'
import { cn } from 'common/cn'
import {
  useSurveyEditorFocus,
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_SECTION,
} from 'appAdmin/component/SurveyEditor'

import { SortableItem } from './SortableItem'
import { toGroupDndId } from './hook/dndId'

export interface QuestionGroupItemViewProps {
  questionGroup: SurveySection
  questions: SurveyElementBase[]
  isCollapsed?: boolean
  onToggleCollapse?: (groupId: string, e: React.MouseEvent) => void
  showQuestionCount?: boolean
  showQuestionDetails?: boolean
  isDragOverlay?: boolean
}

export const QuestionGroupItemView: React.FC<QuestionGroupItemViewProps> =
  React.memo(
    function QuestionGroupItemView({
      questionGroup,
      questions,
      isCollapsed = false,
      onToggleCollapse,
      showQuestionCount = false,
      showQuestionDetails = false,
      isDragOverlay = false,
    }) {
      const langEditing = useSurveyEditorStore((state) => state.langEditing)
      const langDefault = useSurveyEditorStore((state) => state.langDefault)
      const defaults = useSurveyEditorStore((state) => state.defaults)
      const scrollToEntity = useSurveyEditorStore(
        (state) => state.scrollToEntity,
      )
      const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
      const hasQuestions = questions.length > 0

      const handleGroupClick = () => {
        setSurveyFocus({
          entityType: SURVEY_ENTITY_TYPE_SECTION,
          id: questionGroup._id,
        })
        const survey = useSurveyEditorStore.getState().survey
        if (!survey) return
        const presentation = survey.getPresentation(defaults)
        scrollToEntity(
          SURVEY_ENTITY_TYPE_SECTION,
          questionGroup._id,
          survey,
          presentation,
        )
      }

      return (
        <SortableItem
          id={toGroupDndId(questionGroup._id)}
          data={{ type: SURVEY_ENTITY_TYPE_SECTION }}
        >
          <ListGroupItem
            className={cn(
              'cursor-pointer pr-3 group group-item border-l-4 transition-colors',
              {
                'border-primary':
                  surveyFocus?.entityType == SURVEY_ENTITY_TYPE_SECTION &&
                  surveyFocus?.id == questionGroup._id,
                'border-transparent':
                  surveyFocus?.entityType != SURVEY_ENTITY_TYPE_SECTION ||
                  surveyFocus?.id != questionGroup._id,
                'has-questions': hasQuestions,
              },
            )}
            onClick={handleGroupClick}
          >
            <div className="flex justify-between items-center group-title">
              <div className="flex grow justify-between" role="button">
                <div className="flex grow items-center text-xs">
                  {!isDragOverlay && (
                    <Layers
                      className="drag-handle h-4 w-4 mr-1"
                      data-testid="section-drag-handle"
                    />
                  )}
                  {showQuestionDetails && questionGroup.code && (
                    <Badge variant="outline" className="mr-1 py-0 group-count">
                      {questionGroup.code}
                    </Badge>
                  )}
                  <span
                    className="group-name truncate w-[6rem]"
                    data-testid="section-name"
                  >
                    {stripHtml(
                      questionGroup.name.getLang(langEditing, langDefault),
                    )}
                  </span>
                </div>
                {showQuestionCount && hasQuestions && (
                  <Badge
                    variant="secondary"
                    className="mx-1 py-0 question-count"
                  >
                    {questions.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center">
                {hasQuestions && onToggleCollapse && (
                  <div
                    className="collapse-toggle"
                    onClick={(e) => onToggleCollapse(questionGroup._id, e)}
                    role="button"
                    title={
                      isCollapsed ? 'Expand questions' : 'Collapse questions'
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </ListGroupItem>
        </SortableItem>
      )
    },
    (prev, next) =>
      prev.questionGroup === next.questionGroup &&
      prev.isCollapsed === next.isCollapsed &&
      prev.onToggleCollapse === next.onToggleCollapse &&
      prev.showQuestionCount === next.showQuestionCount &&
      prev.showQuestionDetails === next.showQuestionDetails &&
      prev.isDragOverlay === next.isDragOverlay &&
      prev.questions.length === next.questions.length &&
      prev.questions.every((q, i) => q === next.questions[i]),
  )
