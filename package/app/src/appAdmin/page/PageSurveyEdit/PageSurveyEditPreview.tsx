import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Survey, SurveyPrintView } from 'component/Survey'
import type { SurveyAnswers } from 'component/Survey/SurveyTypes'
import { Button } from 'component/shadcn/button'
import {
  SurveyEditorNavContainer,
  useSurveyEditorStore,
  useLangFetchSwitch,
} from 'appAdmin/component/SurveyEditor'
import { SurveyEditorPublish } from 'appAdmin/component/SurveyEditorPublish'
import i18next from 'appAdmin/i18n'
import { usePageTitle } from 'hook'
import { SUPPORTED_UI_LANGUAGES } from 'common/i18n/uiLanguages'

export const PageSurveyEditPreview: React.FC = () => {
  const { t } = useTranslation('app-survey')
  const survey = useSurveyEditorStore((state) => state.survey)
  const settingSurvey = useSurveyEditorStore((state) => state.defaults)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const setLangEditing = useSurveyEditorStore((state) => state.setLangEditing)
  const switchLangFetch = useLangFetchSwitch()
  const [previewAnswers, setPreviewAnswers] = useState<SurveyAnswers | null>(
    null,
  )
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  usePageTitle(`Preview - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const surveyDefaultLanguage = survey?.language?.default

  // Mirrors appSurvey's PageSurvey.handleLanguageChange: the survey's
  // content-language selector also drives the app-survey UI chrome language,
  // falling back to the survey's default language, then English, when the
  // selected content language has no UI translation.
  const resolveUiLanguage = useCallback(
    (lang: string) =>
      SUPPORTED_UI_LANGUAGES.includes(lang)
        ? lang
        : surveyDefaultLanguage &&
            SUPPORTED_UI_LANGUAGES.includes(surveyDefaultLanguage)
          ? surveyDefaultLanguage
          : 'en',
    [surveyDefaultLanguage],
  )

  const handleLanguageChange = useCallback(
    (lang: string) => {
      switchLangFetch(lang)
      setLangEditing(lang)
      i18next.changeLanguage(resolveUiLanguage(lang))
    },
    [switchLangFetch, setLangEditing, resolveUiLanguage],
  )

  // Landing on the preview route (fresh navigation or remount) does not
  // invoke handleLanguageChange, so the UI chrome language must be synced
  // separately here to match the already-selected langEditing.
  useEffect(() => {
    if (langEditing) {
      i18next.changeLanguage(resolveUiLanguage(langEditing))
    }
  }, [langEditing, resolveUiLanguage])

  return (
    <SurveyEditorNavContainer
      surveyName={survey?.name}
      headerActions={<SurveyEditorPublish />}
    >
      <div className="px-4 pt-6 pb-4 mx-auto w-full max-w-4xl box-border">
        {showPrintPreview && previewAnswers && survey ? (
          <>
            <div className="print:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setShowPrintPreview(false)}
              >
                {t('print.backToSurvey')}
              </Button>
            </div>
            <SurveyPrintView
              survey={survey}
              answers={previewAnswers}
              lang={langEditing || surveyDefaultLanguage || 'en'}
            />
          </>
        ) : (
          <Survey
            settingSurvey={settingSurvey}
            survey={survey}
            initLanguage={langEditing}
            onLanguageChange={handleLanguageChange}
            onComplete={setPreviewAnswers}
            onPrint={() => setShowPrintPreview(true)}
          />
        )}
      </div>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditPreview
