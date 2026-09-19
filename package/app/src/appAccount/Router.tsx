import { isSelfHosted, lazyWithChunkReload as lazy } from 'common'
import {
  createRoutesFromElements,
  createBrowserRouter,
  Route,
} from 'react-router-dom'

import { AuthGate } from 'component/AuthGate'
import { Page404 } from 'component/Page404'
import { PageError } from 'component/PageError'

import { extraRouteObjects, isGenerated } from './cloudComposition'

const PageLogin = lazy(() => import('./page/PageLogin'))
const PageLogout = lazy(() => import('./page/PageLogout'))
const PagePasswordReset = lazy(() => import('./page/PagePasswordReset'))
const PageProfile = lazy(() => import('./page/PageProfile'))
const PageVerifyEmail = lazy(() => import('./page/PageVerifyEmail'))
const PageProfileBasic = lazy(() => import('./page/PageProfileBasic'))
const PageProfileEmail = lazy(() => import('./page/PageProfileEmail'))
const PageProfilePassword = lazy(() => import('./page/PageProfilePassword'))
const PageProfileSecurity = lazy(() => import('./page/PageProfileSecurity'))
const PageTeamInviteAccept = lazy(() => import('./page/PageTeamInviteAccept'))

// `extraRouteObjects` (and any cloud UI registered into the shared shell's
// extension points — account footer nav, login-page extra content, see
// model/AccountUiExtension.ts) comes from `./cloudComposition`, a generated
// file (gitignored — see package/app/.gitignore): a self-hosted-safe default
// in a standalone/self-hosted build, or the real commercial-only wiring in a
// commercial build. Deliberately generic here too — this file is committed
// public source and must not name which commercial-only features exist. See
// the "Composition gate" comment in ./cloudCompositionDefault.tsx.
if (!isSelfHosted() && !isGenerated) {
  throw new Error(
    'appAccount/cloudComposition.tsx is still the self-hosted stub in a cloud ' +
      'build. Run `pnpm run generate-cloud-composition` (or `pnpm build`/`pnpm ' +
      'dev`, which do this automatically) from a commercial checkout before ' +
      'building appAccount. See the "Composition gate" comment in ' +
      'cloudCompositionDefault.tsx.',
  )
}

const routes = createRoutesFromElements(
  <Route errorElement={<PageError />}>
    <Route path="/login" element={<PageLogin />} />
    <Route path="/logout" element={<PageLogout />} />
    <Route
      path="/profile"
      element={
        <AuthGate>
          <PageProfile />
        </AuthGate>
      }
    />
    <Route
      path="/profile/basic"
      element={
        <AuthGate>
          <PageProfileBasic />
        </AuthGate>
      }
    />
    <Route
      path="/profile/email"
      element={
        <AuthGate>
          <PageProfileEmail />
        </AuthGate>
      }
    />
    <Route
      path="/profile/password"
      element={
        <AuthGate>
          <PageProfilePassword />
        </AuthGate>
      }
    />
    <Route
      path="/profile/security"
      element={
        <AuthGate>
          <PageProfileSecurity />
        </AuthGate>
      }
    />
    <Route path="/team-invite/accept" element={<PageTeamInviteAccept />} />
    <Route path="/password-reset" element={<PagePasswordReset />} />
    <Route path="/verify-email" element={<PageVerifyEmail />} />
  </Route>,
)

routes[0].children = [
  ...(routes[0].children ?? []),
  ...extraRouteObjects,
  { path: '*', element: <Page404 /> },
]

// Configurable basename so the self-hosted edition can serve the account app
// from a sub-path (e.g. `/account`). Cloud default is empty (origin root).
const accountBasename = process.env.PUBLIC_BASE_ACCOUNT || undefined
const router = createBrowserRouter(
  routes,
  accountBasename ? { basename: accountBasename } : undefined,
)

export { router }

export default router
