import React, { useCallback } from 'react'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { ContentEditable } from 'appAdmin/component/ContentEditable'
import {
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_TITLE,
  SURVEY_UI_ID_TITLE,
} from 'appAdmin/component/SurveyEditor'

import { useSurveyEditorValidation } from './validation'
import { FieldError } from 'component/Form'

export const SurveyTitleInput: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const surveyTitle = useSurveyEditorStore((state) => state.survey?.title)
  const hasSurveyName = useSurveyEditorStore((state) => !!state.survey?.name)
  const surveyFocus = useSurveyEditorStore((state) => state.surveyFocus)
  const setSurveyFocus = useSurveyEditorStore((state) => state.setSurveyFocus)
  const updateSurveyTitle = useSurveyEditorStore(
    (state) => state.operations?.updateSurveyTitle,
  )
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)
  const { getFieldError } = useSurveyEditorValidation()

  const handleFocusTitle = useCallback(() => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_TITLE,
    })
  }, [setSurveyFocus])

  const handleTitleChange = useCallback(
    (value: string) => {
      updateSurveyTitle?.(value, langEditing)
    },
    [updateSurveyTitle, langEditing],
  )

  if (!hasSurveyName || !langEditing || !surveyTitle) return null

  const focused = surveyFocus?.entityType == SURVEY_ENTITY_TYPE_TITLE
  const effectiveLangDefault = focused ? '' : langDefault
  const validationErrors = survey?._id
    ? getFieldError('survey', survey._id, `title.${langEditing}`)
    : undefined

  return (
    <div
      id={SURVEY_UI_ID_TITLE}
      className={cn(
        'transition-colors rounded-md p-4 border-l-4 border-transparent',
        focused ? 'border-primary bg-primary/5' : 'hover:bg-muted dark:hover:bg-muted/25',
      )}
    >
      <div className="text-lg font-thin">
        <ContentEditable
          plaintext={true}
          value={surveyTitle.getLang(langEditing, effectiveLangDefault)}
          placeholder={
            stripHtml(surveyTitle.getLang(langDefault)) ||
            survey?.name ||
            'Your title here'
          }
          onChange={handleTitleChange}
          onClick={handleFocusTitle}
          onFocus={handleFocusTitle}
        />
        <hr className="mt-1" />
        <FieldError errors={validationErrors} />
      </div>
    </div>
  )
}
