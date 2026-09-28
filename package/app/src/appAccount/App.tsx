import React, { Suspense, lazy } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
)

import '../index.css'

import { queryClient, browserPersister } from 'common'
import { ThemeProvider } from 'component/ThemeProvider'
import { Toaster } from 'component/shadcn/sonner'
import { SiteAccessGate } from 'component/SiteAccessGate'
import { CookieConsentBanner } from 'component/CookieConsent'
import { GoogleAnalytics } from 'component/GoogleAnalytics'
import { VersionUpdateBanner } from 'component/VersionUpdateBanner'
import { AuthBroadcastProvider } from 'component/AuthBroadcastProvider'

import { router } from './Router'
import { RouteLoading } from './component/RouteLoading'

export const App: React.FC = () => {
  return (
    <div data-testid="account-app-container">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: browserPersister, maxAge: Infinity }}
      >
        <ThemeProvider>
          <SiteAccessGate>
            <AuthBroadcastProvider />
            <Suspense fallback={<RouteLoading />}>
              <RouterProvider router={router} />
            </Suspense>
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          </SiteAccessGate>
          <Toaster />
          <CookieConsentBanner />
          <GoogleAnalytics tagId={process.env.PUBLIC_GA_TAG_ID_ACCOUNT ?? ''} />
          <VersionUpdateBanner />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </div>
  )
}

export default App
