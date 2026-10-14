import React, { Suspense, lazy } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
)

import { queryClient, browserPersister } from 'common'
import { ThemeProvider } from 'component/ThemeProvider'
import { Toaster } from 'component/shadcn/sonner'
import { VersionUpdateBanner } from 'component/VersionUpdateBanner'
import { AuthBroadcastProvider } from 'component/AuthBroadcastProvider'
import { SocketProvider } from 'component/SocketProvider'
import { getAdminRootExtra } from 'registry'

import { SiteAccessGate } from 'component/SiteAccessGate'

import { RouteLoading } from './component/RouteLoading'
import { ADMIN_REALTIME_INVALIDATION } from './common/realtimeInvalidation'
import { router } from './Router'
import '../index.css'
import './index.css'

// Resolved once at module load: the extension registers before the app renders
// (same pattern as NavbarBrandAdmin's getAdminNavbarExtra()).
const AdminRootExtra = getAdminRootExtra()

export const App: React.FC = () => {
  return (
    <div data-testid="admin-app-container">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: browserPersister, maxAge: Infinity }}
      >
        <ThemeProvider>
          <SiteAccessGate>
            <AuthBroadcastProvider />
            <SocketProvider invalidationMap={ADMIN_REALTIME_INVALIDATION} />
            <Suspense fallback={<RouteLoading />}>
              <RouterProvider router={router} />
            </Suspense>
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          </SiteAccessGate>
          <Toaster />
          {AdminRootExtra && <AdminRootExtra />}
          <VersionUpdateBanner />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </div>
  )
}

export default App
