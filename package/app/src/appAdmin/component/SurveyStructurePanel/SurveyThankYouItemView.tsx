import React from 'react'
import { Survey } from 'veysur-common'

import { ListGroupItem } from 'component/shadcn/list-group'
import { cn } from 'common/cn'
import {
  useSurveyEditorFocus,
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_THANK_YOU,
} from 'appAdmin/component/SurveyEditor'

export interface SurveyThankYouItemViewProps {
  survey: Survey
}

export const SurveyThankYouItemView: React.FC<SurveyThankYouItemViewProps> = ({
  survey,
}) => {
  const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
  const defaults = useSurveyEditorStore((state) => state.defaults)
  const scrollToEntity = useSurveyEditorStore((state) => state.scrollToEntity)

  const handleGroupClick = () => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_THANK_YOU,
    })
    const presentation = survey.getPresentation(defaults)
    scrollToEntity(
      SURVEY_ENTITY_TYPE_THANK_YOU,
      undefined,
      survey,
      presentation,
    )
  }

  return (
    <ListGroupItem
      className={cn(
        'cursor-pointer flex justify-between items-center survey-completed border-l-4 transition-colors',
        {
          'border-primary':
            surveyFocus?.entityType === SURVEY_ENTITY_TYPE_THANK_YOU,
          'border-transparent':
            surveyFocus?.entityType !== SURVEY_ENTITY_TYPE_THANK_YOU,
        },
      )}
      onClick={handleGroupClick}
    >
      <div className="flex items-center font-medium">Thank you</div>
    </ListGroupItem>
  )
}
