import { useQueryClient } from '@tanstack/react-query'

import { KEY_STATE_SURVEY_EDITING } from 'appAdmin/common'

import { useSurveyEditorStore } from './useSurveyEditorStore'

export const useLangFetchSwitch = () => {
  const queryClient = useQueryClient()
  const setLangFetch = useSurveyEditorStore((state) => state.setLangFetch)
  const langFetch = useSurveyEditorStore((state) => state.langFetch)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)

  return (language: string) => {
    // Only fetch when switching to a language not already in the survey data.
    // The default language is always loaded; the last fetched non-default is
    // also loaded (its data is merged into the survey's L10n objects).
    const needsFetch = language !== langDefault && language !== langFetch
    if (needsFetch) {
      // Pre-seed the cache for the new key so the survey doesn't go
      // undefined while the fetch is in-flight.
      const currentData = queryClient.getQueryData([
        KEY_STATE_SURVEY_EDITING,
        langFetch,
        langDefault,
      ])
      if (currentData !== undefined) {
        queryClient.setQueryData(
          [KEY_STATE_SURVEY_EDITING, language, langDefault],
          currentData,
        )
      }
      setLangFetch(language)
    }
  }
}
