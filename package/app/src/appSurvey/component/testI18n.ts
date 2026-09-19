import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    'app-survey': {
      'registration.accessTokenRequired.title': 'Access Token Required',
      'registration.accessTokenRequired.body':
        'This survey requires an access token to continue.',
      'registration.accessToken.label': 'Access Token',
      'registration.accessToken.placeholder': 'Enter your access token',
      'registration.accessToken.required': 'Please enter an access token',
      'registration.submit': 'Continue',
      'registration.invalidTokenTitle': 'Invalid Token',
      'registration.contactAdmin':
        "Don't have a token? Contact the survey administrator",
    },
  },
}

export const testI18n = i18next.createInstance()
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['app-survey'],
  defaultNS: 'app-survey',
  resources,
  interpolation: { escapeValue: false },
})

export default testI18n
