import { lazyWithChunkReload as lazy } from 'common'
import {
  createRoutesFromElements,
  createBrowserRouter,
  Route,
  Navigate,
} from 'react-router-dom'

import { AuthGate } from 'appAdmin/component/AuthGate'
import { Page404 } from 'component/Page404'
import { PageError } from 'component/PageError'

const PageLogin = lazy(() => import('./page/PageLogin'))
const PageLogout = lazy(() => import('./page/PageLogout'))
const PageTestFileUpload = lazy(
  () => import('./page/PageTest/PageTestFileUpload'),
)
const PageSettingSurvey = lazy(
  () => import('./page/PageSetting/PageSettingSurvey'),
)
const PageSettingProject = lazy(
  () => import('./page/PageSetting/PageSettingProject'),
)
const PageTeam = lazy(() => import('./page/PageTeam/PageTeam'))
const PageTeamInvite = lazy(() => import('./page/PageTeam/PageTeamInvite'))
const PageSurvey = lazy(() => import('./page/PageSurvey/PageSurvey'))
const PageSurveyEdit = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEdit'),
)
const PageSurveyEditContainer = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditContainer'),
)
const PageSurveyEditParticipant = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditParticipant'),
)
const PageSurveyEditParticipantAdd = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditParticipantAdd'),
)
const PageSurveyEditParticipantEdit = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditParticipantEdit'),
)
const PageSurveyEditParticipantImport = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditParticipantImport'),
)
const PageSurveyEditParticipantGen = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditParticipantGen'),
)
const PageSurveyEditParticipantAttributes = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditParticipantAttributes'),
)
const PageSurveyEditPreview = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditPreview'),
)
const PageSurveyNew = lazy(() => import('./page/PageSurvey/PageSurveyNew'))
const PageSurveyImport = lazy(
  () => import('./page/PageSurvey/PageSurveyImport'),
)
const PageSurveyEditResponse = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditResponse'),
)
const PageSurveyEditResponseView = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditResponseView'),
)
const PageSurveyEditResponseAdd = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditResponseAdd'),
)
const PageSurveyEditResponseEdit = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditResponseEdit'),
)
const PageSurveyEditResponseImport = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditResponseImport'),
)
const PageSurveyEditSetting = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditSetting'),
)
const PageSurveyEditSnapshot = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditSnapshot'),
)
const PageSurveyEditSnapshotEdit = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditSnapshotEdit'),
)
const PageSurveyEditPublication = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditPublication'),
)
const PageSurveyEditPublicationEdit = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditPublicationEdit'),
)
const PageSurveyEditPublicationImport = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditPublicationImport'),
)
const PageSurveyEditPublicationMerge = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditPublicationMerge'),
)
const PageSurveyEditShare = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditShare'),
)
const PageSurveyEditStat = lazy(
  () => import('./page/PageSurveyEdit/PageSurveyEditStat'),
)

const routes = createRoutesFromElements(
  <Route errorElement={<PageError />}>
    <Route path="/login" element={<PageLogin />} />
    <Route path="/logout" element={<PageLogout />} />
    <Route
      path="/team"
      element={
        <AuthGate>
          <PageTeam />
        </AuthGate>
      }
    />
    <Route
      path="/team/invite"
      element={
        <AuthGate>
          <PageTeamInvite />
        </AuthGate>
      }
    />
    <Route
      path="/"
      element={
        <AuthGate>
          <Navigate to="/survey" replace />
        </AuthGate>
      }
    />
    <Route
      path="/test/file-upload"
      element={
        <AuthGate>
          <PageTestFileUpload />
        </AuthGate>
      }
    />
    <Route
      path="/setting/survey"
      element={
        <AuthGate>
          <Navigate to="/setting/survey/language" replace />
        </AuthGate>
      }
    />
    <Route
      path="/setting/survey/:section"
      element={
        <AuthGate>
          <PageSettingSurvey />
        </AuthGate>
      }
    />
    <Route
      path="/setting/project"
      element={
        <AuthGate>
          <PageSettingProject />
        </AuthGate>
      }
    />
    <Route
      path="/survey/:surveyId"
      element={
        <AuthGate>
          <PageSurveyEditContainer />
        </AuthGate>
      }
    >
      <Route path="edit" element={<PageSurveyEdit />} />
      <Route path="setting/:section" element={<PageSurveyEditSetting />} />
      <Route path="participant" element={<PageSurveyEditParticipant />} />
      <Route
        path="participant/add"
        element={<PageSurveyEditParticipantAdd />}
      />
      <Route
        path="participant/:participantId/edit"
        element={<PageSurveyEditParticipantEdit />}
      />
      <Route
        path="participant/import"
        element={<PageSurveyEditParticipantImport />}
      />
      <Route
        path="participant/generate"
        element={<PageSurveyEditParticipantGen />}
      />
      <Route
        path="participant/attributes"
        element={<PageSurveyEditParticipantAttributes />}
      />
      <Route path="preview" element={<PageSurveyEditPreview />} />
      <Route path="response" element={<PageSurveyEditResponse />} />
      <Route
        path="response/import"
        element={<PageSurveyEditResponseImport />}
      />
      <Route
        path="response/snapshot/:snapshotId"
        element={<PageSurveyEditResponse />}
      />
      <Route
        path="response/snapshot/:snapshotId/add"
        element={<PageSurveyEditResponseAdd />}
      />
      <Route
        path="response/:responseId/view"
        element={<PageSurveyEditResponseView />}
      />
      <Route
        path="response/:responseId/edit"
        element={<PageSurveyEditResponseEdit />}
      />
      <Route path="snapshot" element={<PageSurveyEditSnapshot />} />
      <Route
        path="snapshot/:snapshotId/edit"
        element={<PageSurveyEditSnapshotEdit />}
      />
      <Route path="publication" element={<PageSurveyEditPublication />} />
      <Route
        path="publication/import"
        element={<PageSurveyEditPublicationImport />}
      />
      <Route
        path="publication/:publicationId/edit"
        element={<PageSurveyEditPublicationEdit />}
      />
      <Route
        path="publication/:publicationId/merge"
        element={<PageSurveyEditPublicationMerge />}
      />
      <Route path="share" element={<PageSurveyEditShare />} />
      <Route path="stat" element={<PageSurveyEditStat />} />
    </Route>
    <Route
      path="/survey"
      element={
        <AuthGate>
          <PageSurvey />
        </AuthGate>
      }
    />
    <Route
      path="/survey/new"
      element={
        <AuthGate>
          <PageSurveyNew />
        </AuthGate>
      }
    />
    <Route
      path="/survey/import"
      element={
        <AuthGate>
          <PageSurveyImport />
        </AuthGate>
      }
    />
    <Route path="*" element={<Page404 />} />
  </Route>,
)

// Basename is configurable so the self-hosted edition can serve admin from a
// path other than `/admin` (e.g. `/` on a single origin). Defaults to today's
// cloud value.
const router = createBrowserRouter(routes, {
  basename: process.env.PUBLIC_BASE_ADMIN || '/admin',
})

export { router }

export default router
