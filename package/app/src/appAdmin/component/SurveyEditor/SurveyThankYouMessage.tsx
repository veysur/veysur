import React, { useCallback, useMemo } from 'react'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { Card, CardContent } from 'component/shadcn/card'
import { FieldError } from 'component/Form'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import {
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_THANK_YOU,
  SURVEY_UI_ID_THANK_YOU,
} from 'appAdmin/component/SurveyEditor'
import {
  useTextExpressionVariablePicker,
  useSurveyContentFormat,
} from 'appAdmin/component/SurveyEditor/hook'

export const SurveyThankYouMessage: React.FC = () => {
  const thankYouMessage = useSurveyEditorStore(
    (state) => state.survey?.thankYouSection?.desc,
  )
  const hasThankYou = useSurveyEditorStore(
    (state) => !!state.survey?.thankYouSection,
  )
  const setSurveyFocus = useSurveyEditorStore((state) => state.setSurveyFocus)
  const surveyFocus = useSurveyEditorStore((state) => state.surveyFocus)
  const updateSurveyThankYouMessage = useSurveyEditorStore(
    (state) => state.operations?.updateSurveyThankYouMessage,
  )
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)

  const handleFocusThankYouMessage = useCallback(() => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_THANK_YOU,
    })
  }, [setSurveyFocus])

  const handleThankYouMessageChange = useCallback(
    (value: string) => {
      updateSurveyThankYouMessage?.(value, langEditing)
    },
    [updateSurveyThankYouMessage, langEditing],
  )

  const { variablePickerGroups, validate: validateTextExpressions } =
    useTextExpressionVariablePicker('end')
  const { format: contentFormat } = useSurveyContentFormat()

  const focused = surveyFocus?.entityType === SURVEY_ENTITY_TYPE_THANK_YOU
  const effectiveLangDefault = focused ? '' : langDefault
  const thankYouMessageValue = thankYouMessage?.getLang(
    langEditing || '',
    effectiveLangDefault,
  )

  const thankYouMessageExpressionErrors = useMemo(
    () =>
      thankYouMessageValue
        ? validateTextExpressions(thankYouMessageValue).map((e) => e.message)
        : [],
    [validateTextExpressions, thankYouMessageValue],
  )

  if (!hasThankYou || !langEditing) return null

  return (
    <div
      data-testid="survey-thankyou-container"
      className={cn(
        'transition-colors rounded-md p-4 border-l-4 border-transparent',
        focused ? 'border-primary bg-primary/5' : 'hover:bg-muted dark:hover:bg-muted/25',
      )}
    >
      <Card className="shadow-sm bg-muted border-muted">
        <CardContent>
          <div id={SURVEY_UI_ID_THANK_YOU}>
            <ContentEditor
              value={thankYouMessageValue}
              variant="inline"
              withToolbar={true}
              toolbarExtra={true}
              format={contentFormat}
              variablePickerGroups={variablePickerGroups}
              placeholder={
                stripHtml(thankYouMessage?.getLang(langDefault) ?? '') ||
                'Thank You!'
              }
              onChange={handleThankYouMessageChange}
              onClick={handleFocusThankYouMessage}
              onFocus={handleFocusThankYouMessage}
            />
            <FieldError errors={thankYouMessageExpressionErrors} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
