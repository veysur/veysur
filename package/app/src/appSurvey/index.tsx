import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import './i18n'

import 'common/initMoment'

Sentry.init({
  dsn: process.env.PUBLIC_BUGSINK_DSN_SURVEY,
  environment: import.meta.env.MODE,
  release: process.env.BUILD_VERSION,
  tracesSampleRate: 0,
  sendDefaultPii: true,
  enabled: !!process.env.PUBLIC_BUGSINK_DSN_SURVEY,
})

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
