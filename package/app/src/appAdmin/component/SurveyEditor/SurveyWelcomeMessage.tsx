import React, { useCallback, useMemo } from 'react'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { Card, CardContent } from 'component/shadcn/card'
import { FieldError } from 'component/Form'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import {
  useSurveyEditorStore,
  useSurveyContentFormat,
  SURVEY_ENTITY_TYPE_WELCOME,
  SURVEY_UI_ID_WELCOME,
} from 'appAdmin/component/SurveyEditor'
import { useTextExpressionVariablePicker } from 'appAdmin/component/SurveyEditor/hook'

export const SurveyWelcomeMessage: React.FC = () => {
  const welcomeMessage = useSurveyEditorStore(
    (state) => state.survey?.welcomeSection?.desc,
  )
  const hasWelcome = useSurveyEditorStore(
    (state) => !!state.survey?.welcomeSection,
  )
  const setSurveyFocus = useSurveyEditorStore((state) => state.setSurveyFocus)
  const surveyFocus = useSurveyEditorStore((state) => state.surveyFocus)
  const updateSurveyWelcomeMessage = useSurveyEditorStore(
    (state) => state.operations?.updateSurveyWelcomeMessage,
  )
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)
  const { format: contentFormat } = useSurveyContentFormat()

  // `'start'`: the welcome message renders before every question, so every
  // question/answer reference is a forward reference; only participant.*,
  // response.* and the (forward-ref-exempt) labels.* are on offer.
  const { variablePickerGroups, validate: validateWelcomeExpressions } =
    useTextExpressionVariablePicker('start')

  const handleFocusWelcomeMessage = useCallback(() => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_WELCOME,
    })
  }, [setSurveyFocus])

  const handleWelcomeMessageChange = useCallback(
    (value: string) => {
      updateSurveyWelcomeMessage?.(value, langEditing)
    },
    [updateSurveyWelcomeMessage, langEditing],
  )

  const focused = surveyFocus?.entityType === SURVEY_ENTITY_TYPE_WELCOME
  const effectiveLangDefault = focused ? '' : langDefault
  const welcomeMessageValue = welcomeMessage?.getLang(
    langEditing || '',
    effectiveLangDefault,
  )

  const welcomeMessageExpressionErrors = useMemo(
    () =>
      welcomeMessageValue
        ? validateWelcomeExpressions(welcomeMessageValue).map((e) => e.message)
        : [],
    [validateWelcomeExpressions, welcomeMessageValue],
  )

  if (!hasWelcome || !langEditing) return null

  return (
    <div
      data-testid="survey-welcome-container"
      className={cn(
        'transition-colors rounded-md p-4 border-l-4 border-transparent',
        focused ? 'border-primary bg-editor-focus' : 'hover:bg-muted dark:hover:bg-muted/50',
      )}
    >
      <Card className="border shadow-sm bg-muted border-muted">
        <CardContent>
          <div id={SURVEY_UI_ID_WELCOME}>
            <ContentEditor
              value={welcomeMessageValue}
              variant="inline"
              withToolbar={true}
              toolbarExtra={true}
              format={contentFormat}
              variablePickerGroups={variablePickerGroups}
              placeholder={
                stripHtml(welcomeMessage?.getLang(langDefault) ?? '') ||
                'Welcome!'
              }
              onChange={handleWelcomeMessageChange}
              onClick={handleFocusWelcomeMessage}
              onFocus={handleFocusWelcomeMessage}
            />
            <FieldError errors={welcomeMessageExpressionErrors} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
