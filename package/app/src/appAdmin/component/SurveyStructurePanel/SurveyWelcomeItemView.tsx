import React from 'react'
import { Survey } from 'veysur-common'

import { ListGroupItem } from 'component/shadcn/list-group'
import { cn } from 'common/cn'
import {
  useSurveyEditorFocus,
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_WELCOME,
} from 'appAdmin/component/SurveyEditor'

export interface SurveyWelcomeItemViewProps {
  survey: Survey
}

export const SurveyWelcomeItemView: React.FC<SurveyWelcomeItemViewProps> = ({
  survey,
}) => {
  const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
  const defaults = useSurveyEditorStore((state) => state.defaults)
  const scrollToEntity = useSurveyEditorStore((state) => state.scrollToEntity)

  const handleOnClick = () => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_WELCOME,
    })
    const presentation = survey.getPresentation(defaults)
    scrollToEntity(SURVEY_ENTITY_TYPE_WELCOME, undefined, survey, presentation)
  }

  return (
    <ListGroupItem
      className={cn(
        'cursor-pointer flex justify-between items-center survey-welcome border-l-4 transition-colors',
        {
          'border-primary':
            surveyFocus?.entityType === SURVEY_ENTITY_TYPE_WELCOME,
          'border-transparent':
            surveyFocus?.entityType !== SURVEY_ENTITY_TYPE_WELCOME,
        },
      )}
      onClick={handleOnClick}
    >
      <div className="flex items-center font-medium">Welcome</div>
    </ListGroupItem>
  )
}
