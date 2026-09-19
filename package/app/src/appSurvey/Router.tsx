import { lazyWithChunkReload as lazy } from 'common'
import {
  createRoutesFromElements,
  createBrowserRouter,
  Route,
} from 'react-router-dom'

import { Page404 } from 'component/Page404'
import { PageError } from 'component/PageError'

const PageHome = lazy(() => import('./page/PageHome'))
const PageSurvey = lazy(() => import('./page/PageSurvey'))
const PageSurveyPrint = lazy(() => import('./page/PageSurveyPrint'))
const PageRegister = lazy(() => import('./page/PageRegister'))

const routes = createRoutesFromElements(
  <Route errorElement={<PageError />}>
    <Route path="/" element={<PageHome />} />
    <Route path="/:surveyId/register" element={<PageRegister />} />
    <Route path="/:surveyId/:token/print" element={<PageSurveyPrint />} />
    <Route path="/:surveyId/print" element={<PageSurveyPrint />} />
    <Route path="/:surveyId/:token?" element={<PageSurvey />} />
    <Route path="*" element={<Page404 />} />
  </Route>,
)

// Route paths are basename-relative (no hardcoded `/survey` prefix) — the
// `/survey` shape comes entirely from the basename, defaulting to `/survey`
// so cloud's served URLs (and the `/survey/:id[...]` links built by
// PageSurveyEditShare.tsx and EmailVerifyToken.buildSurveyLink) are
// unchanged. A self-hosted single-origin deployment can still override
// PUBLIC_BASE_SURVEY to serve from elsewhere.
const surveyBasename = process.env.PUBLIC_BASE_SURVEY || undefined
const router = createBrowserRouter(
  routes,
  surveyBasename ? { basename: surveyBasename } : undefined,
)

export { router }

export default router
