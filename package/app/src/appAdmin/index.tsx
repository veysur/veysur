import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { isSelfHosted } from 'common'

import App from './App'
import './i18n'
import { isGenerated } from './cloudFeatureGate'

import 'common/initMoment'

// `./cloudFeatureGate` is a generated file (gitignored — see
// package/app/.gitignore): a self-hosted-safe no-op stub in a
// standalone/self-hosted build, or the extension's registration call
// (run when this file is imported) in a build that includes the extension.
// See the "Composition gate" comment in appAccount/cloudCompositionDefault.tsx
// for the generator mechanism this mirrors.
if (!isSelfHosted() && !isGenerated) {
  throw new Error(
    'appAdmin/cloudFeatureGate.ts is still the self-hosted stub in a build ' +
      'that includes the extension. Run `pnpm run generate-cloud-composition` (or `pnpm build`/`pnpm ' +
      'dev`, which do this automatically) with the extension package present before ' +
      'building appAdmin. See the "Composition gate" comment in ' +
      'appAccount/cloudCompositionDefault.tsx.',
  )
}

Sentry.init({
  dsn: process.env.PUBLIC_BUGSINK_DSN_ADMIN,
  environment: import.meta.env.MODE,
  release: process.env.BUILD_VERSION,
  tracesSampleRate: 0,
  sendDefaultPii: true,
  enabled: !!process.env.PUBLIC_BUGSINK_DSN_ADMIN,
})

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
