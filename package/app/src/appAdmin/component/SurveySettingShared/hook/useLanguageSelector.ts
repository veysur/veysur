import { useState, useMemo } from 'react'
import { getLanguageName, L10n, sortLanguageCodesByName } from 'veysur-common'

import { SettingsDataAdapter } from '../SettingSurveyAdapter'

export function useLanguageSelector<T>(data: SettingsDataAdapter<T>) {
  const getDefaultLanguage = () => {
    if ('language' in data) {
      return data.language?.default || 'en'
    }
    return 'en'
  }

  const [selectedLanguage, setSelectedLanguage] = useState(getDefaultLanguage())

  const availableLanguages = useMemo(() => {
    const languages = sortLanguageCodesByName(data.language?.options || [])
    return languages.map((languageCode: string) => {
      const languageLabel = getLanguageName(languageCode)
      return {
        value: languageCode,
        label: languageLabel
          ? `${languageLabel} (${languageCode.toUpperCase()})`
          : languageCode,
      }
    })
  }, [data.language?.options])

  const langEditing = selectedLanguage || getDefaultLanguage()

  const getText = (obj: L10n | undefined | null, lang: string) => {
    return obj ? obj.getLangOrNull(lang) : undefined
  }

  return {
    selectedLanguage,
    setSelectedLanguage,
    availableLanguages,
    langEditing,
    getText,
  }
}
