import React from 'react'
import { sortLanguageCodesByName } from 'veysur-common'

import { LanguageSelector } from 'component/LanguageSelector'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

import { useLangFetchSwitch } from './hook/useLangFetchSwitch'

export const SurveyLanguageSelector: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const setLangEditing = useSurveyEditorStore((state) => state.setLangEditing)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const switchLangFetch = useLangFetchSwitch()

  const availableLanguages = sortLanguageCodesByName(
    survey?.language?.options || [],
  )
  const hasLanguageOptions = availableLanguages.length > 1

  if (!hasLanguageOptions) {
    return null
  }

  return (
    <LanguageSelector
      availableLanguages={availableLanguages}
      langEditing={langEditing}
      onLanguageChange={(language) => {
        switchLangFetch(language)
        setLangEditing(language)
      }}
    />
  )
}
