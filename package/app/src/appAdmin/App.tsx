import React, { Suspense, lazy } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
)

import { queryClient, browserPersister } from 'common'
import { AuthDomainPopup } from 'model'
import { ThemeProvider } from 'component/ThemeProvider'
import { Toaster } from 'component/shadcn/sonner'
import { VersionUpdateBanner } from 'component/VersionUpdateBanner'
import { AuthBroadcastProvider } from 'component/AuthBroadcastProvider'

import { SiteAccessGate } from 'component/SiteAccessGate'

import { AuthWaitingPopup } from './component/AuthWaitingPopup'
import { RouteLoading } from './component/RouteLoading'
import { router } from './Router'
import '../index.css'
import './index.css'

export const App: React.FC = () => {
  return (
    <div data-testid="admin-app-container">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: browserPersister, maxAge: Infinity }}
      >
        <ThemeProvider>
          <SiteAccessGate>
            {/* If this is a popup window opened for authentication, show waiting state
                instead of rendering the full application to prevent user interaction */}
            {AuthDomainPopup.isPopupWindow() ? (
              <AuthWaitingPopup />
            ) : (
              <>
                <AuthBroadcastProvider />
                <Suspense fallback={<RouteLoading />}>
                  <RouterProvider router={router} />
                </Suspense>
                <Suspense fallback={null}>
                  <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
              </>
            )}
          </SiteAccessGate>
          <Toaster />
          <VersionUpdateBanner />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </div>
  )
}

export default App
