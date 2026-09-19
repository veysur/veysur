// cspell:ignore Lngs
import i18next from 'i18next'
import HttpBackend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

import { SUPPORTED_UI_LANGUAGES } from './common'

const NAMESPACE = 'app-survey'

const browserLang = navigator.language?.split('-')[0]?.toLowerCase()
const detectedLng = SUPPORTED_UI_LANGUAGES.includes(browserLang ?? '')
  ? browserLang
  : 'en'

i18next
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: detectedLng,
    fallbackLng: 'en',
    ns: [NAMESPACE],
    defaultNS: NAMESPACE,
    supportedLngs: SUPPORTED_UI_LANGUAGES,
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
    backend: {
      loadPath: `${process.env.PUBLIC_REST_API_BASE_PATH}/locale/{{lng}}/{{ns}}.json?v=${process.env.BUILD_VERSION}`,
    },
  })

export default i18next
