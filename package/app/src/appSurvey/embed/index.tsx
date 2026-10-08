import React from 'react'
import ReactDOM from 'react-dom/client'

import '../i18n'
import 'common/initMoment'

import EmbedApp from './EmbedApp'

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <EmbedApp />
    </React.StrictMode>,
  )
}
