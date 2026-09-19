import React from 'react'
import { Survey } from 'veysur-common'

import { ListGroupItem } from 'component/shadcn/list-group'
import { cn } from 'common/cn'
import {
  useSurveyEditorFocus,
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_TITLE,
} from 'appAdmin/component/SurveyEditor'

export interface SurveyTitleItemViewProps {
  survey: Survey
}

export const SurveyTitleItemView: React.FC<SurveyTitleItemViewProps> = ({
  survey,
}) => {
  const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
  const defaults = useSurveyEditorStore((state) => state.defaults)
  const scrollToEntity = useSurveyEditorStore((state) => state.scrollToEntity)

  const handleOnClick = () => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_TITLE,
    })
    const presentation = survey.getPresentation(defaults)
    scrollToEntity(SURVEY_ENTITY_TYPE_TITLE, undefined, survey, presentation)
  }

  return (
    <ListGroupItem
      className={cn(
        'cursor-pointer flex justify-between items-center survey-title border-0 border-l-4 transition-colors',
        {
          'border-primary':
            surveyFocus?.entityType === SURVEY_ENTITY_TYPE_TITLE,
          'border-transparent':
            surveyFocus?.entityType !== SURVEY_ENTITY_TYPE_TITLE,
        },
      )}
      onClick={handleOnClick}
    >
      <div className="flex items-center font-medium">Title</div>
    </ListGroupItem>
  )
}
