import React from 'react'
import { GripVertical, Type, Video } from 'lucide-react'
import {
  SurveySection,
  SurveyElementBase,
  isSurveyContent,
  CONTENT_TYPE_YOUTUBE,
} from 'veysur-common'

import { Badge } from 'component/shadcn/badge'
import { ListGroupItem } from 'component/shadcn/list-group'
import { cn } from 'common/cn'
import { stripHtml } from 'common'
import {
  useSurveyEditorFocus,
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_CONTENT,
} from 'appAdmin/component/SurveyEditor'

import { SortableItem } from './SortableItem'
import { toQuestionDndId } from './hook/dndId'

export interface QuestionItemViewProps {
  questionGroup: SurveySection
  question: SurveyElementBase
  showQuestionDetails?: boolean
  isDragOverlay?: boolean
}

export const QuestionItemView: React.FC<QuestionItemViewProps> = React.memo(
  function QuestionItemView({
    questionGroup,
    question,
    showQuestionDetails = false,
    isDragOverlay = false,
  }) {
    const langEditing = useSurveyEditorStore((state) => state.langEditing)
    const langDefault = useSurveyEditorStore((state) => state.langDefault)
    const defaults = useSurveyEditorStore((state) => state.defaults)
    const scrollToEntity = useSurveyEditorStore((state) => state.scrollToEntity)
    const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()

    const isContent = isSurveyContent(question)
    const entityType = isContent
      ? SURVEY_ENTITY_TYPE_CONTENT
      : SURVEY_ENTITY_TYPE_ELEMENT

    const handleOnClick = () => {
      setSurveyFocus({ entityType, id: question._id })
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return
      const presentation = survey.getPresentation(defaults)
      scrollToEntity(entityType, question._id, survey, presentation)
    }

    const focused =
      surveyFocus?.entityType == entityType && surveyFocus?.id == question._id

    const ContentIcon = question.type === CONTENT_TYPE_YOUTUBE ? Video : Type

    return (
      <SortableItem
        id={toQuestionDndId(question._id)}
        data={{ type: entityType, groupId: questionGroup._id }}
      >
        <ListGroupItem
          className={cn(
            'cursor-pointer flex justify-between items-center question border-l-4 transition-colors',
            focused ? 'border-primary' : 'border-transparent',
          )}
          data-testid="structure-question-row"
          onClick={handleOnClick}
        >
          <div className="flex items-center text-xs">
            <div className="flex items-center">
              {!isDragOverlay && (
                <GripVertical
                  className="drag-handle h-4 w-4 mr-1"
                  data-testid="element-drag-handle"
                />
              )}
              {isContent ? (
                <ContentIcon className="h-4 w-4 mr-1 text-muted-foreground" />
              ) : (
                showQuestionDetails &&
                question.code && (
                  <Badge
                    variant="secondary"
                    className="question-code mr-1 py-0"
                  >
                    {question.code}
                  </Badge>
                )
              )}
              <span className="question-text truncate w-[10rem]">
                {stripHtml(question.text.getLang(langEditing, langDefault)) ||
                  (isContent ? 'Content' : '')}
              </span>
            </div>
          </div>
        </ListGroupItem>
      </SortableItem>
    )
  },
)
