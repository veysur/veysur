import React, { Suspense, lazy } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'

import '../index.css'

import { queryClient, browserPersister } from 'common'
import { SiteAccessGate } from 'component/SiteAccessGate'
import { VersionUpdateBanner } from 'component/VersionUpdateBanner'

import { router } from './Router'
import { RouteLoading } from './component/RouteLoading'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
)

export const App: React.FC = () => {
  return (
    <div data-testid="survey-app-container">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: browserPersister, maxAge: Infinity }}
      >
        <SiteAccessGate>
          <Suspense fallback={<RouteLoading />}>
            <RouterProvider router={router} />
          </Suspense>
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
          <VersionUpdateBanner />
        </SiteAccessGate>
      </PersistQueryClientProvider>
    </div>
  )
}

export default App
