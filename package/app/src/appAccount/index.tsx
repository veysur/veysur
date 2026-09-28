import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { AuthDomain } from 'model'

import App from './App'

import 'common/initMoment'

Sentry.init({
  dsn: process.env.PUBLIC_BUGSINK_DSN_ACCOUNT,
  environment: import.meta.env.MODE,
  release: process.env.BUILD_VERSION,
  tracesSampleRate: 0,
  sendDefaultPii: true,
  enabled: !!process.env.PUBLIC_BUGSINK_DSN_ACCOUNT,
})

// Redeem any incoming cross-domain auth handoff token and apply it to the
// query cache before the app ever renders - see
// AuthDomain.consumeIncomingHandoffIfPresent for why this must happen before
// render rather than relying on queryClient.ts's own module-init read.
AuthDomain.consumeIncomingHandoffIfPresent().finally(() => {
  const rootEl = document.getElementById('root')
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  }
})
