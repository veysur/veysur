// UI chrome languages with translations available at
// package/api/src/locale/<lng>/app-survey.json. Used by appSurvey and by
// appAdmin's survey preview (which reuses the same component/Survey/ tree
// and app-survey namespace). Extend as translations are added.
export const SUPPORTED_UI_LANGUAGES = [
  'en',
  'de',
  'es',
  'zh',
  'hi',
  'ar',
  'fr',
  'bn',
  'pt',
  'ru',
  'ur',
  'id',
  'ja',
  'mr',
  'te',
  'tr',
  'ta',
  'vi',
  'ko',
  'fa',
  'ha',
  'sw',
  'jv',
  'pa',
  'it',
  'nl',
]

/**
 * Pick the UI chrome language to apply: `preferred` if the app has translations
 * for it, otherwise the survey's default language if translated, otherwise
 * English. Content can be shown in a language the UI is not translated into -
 * this only governs the surrounding chrome.
 */
export function resolveUiLanguage(
  preferred: string | null | undefined,
  surveyDefault: string | null | undefined,
): string {
  if (preferred && SUPPORTED_UI_LANGUAGES.includes(preferred)) return preferred
  if (surveyDefault && SUPPORTED_UI_LANGUAGES.includes(surveyDefault)) {
    return surveyDefault
  }
  return 'en'
}
