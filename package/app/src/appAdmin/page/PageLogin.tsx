import { Navigate } from 'react-router-dom'

import { Container } from 'component/shadcn/container'
import { GoldenCentered } from 'component/GoldenCentered'
import { useFlashMessage } from 'component/FlashMessage'
import { LoginForm } from 'component/LoginForm'
import { LoginAlreadyAuthed } from 'component/LoginAlreadyAuthed'
import { AuthDomain } from 'model'
import { useAuth, usePageTitle, useAuthLoginRedirect } from 'hook'

export const PageLogin: React.FC = () => {
  usePageTitle('Login', { suffix: 'Veysur Admin' })
  useFlashMessage({ autoDisplay: true })
  const { auth, isAuthed, authRefresh } = useAuth()
  const {
    returnTo,
    sameOriginRedirect,
    effectiveAuth,
    effectiveIsAuthed,
    ensureFreshJwtAndHandleAuthed,
    isReturnToSameOrigin,
  } = useAuthLoginRedirect({
    broadcastTimeoutFallback: true,
    requireNoReturnToForHandleAuthed: true,
    deferHandleAuthForBroadcastRelay: true,
  })

  const handleContinueClick = async () => {
    if (!returnTo) return

    if (AuthDomain.onAuthDomain()) {
      // Handle authenticated state - ensure JWT is fresh before transferring
      await ensureFreshJwtAndHandleAuthed(auth)
      return
    }

    // Cross-origin returnTo (e.g. account app) relayed via broadcastAuth -
    // transfer the relayed auth via the server-side handoff
    await AuthDomain.openAccountWithAuth(
      effectiveAuth ?? undefined,
      authRefresh,
    )
  }

  if (isAuthed && sameOriginRedirect) {
    return <Navigate to={sameOriginRedirect} replace />
  }

  const showContinueButton =
    effectiveIsAuthed &&
    !!returnTo &&
    (AuthDomain.onAuthDomain() || !isReturnToSameOrigin(returnTo))
  const isTargetDomainAuthorized =
    !!returnTo &&
    AuthDomain.isTargetDomainAuthorized(returnTo, effectiveAuth ?? undefined)

  return (
    <Container>
      <GoldenCentered className="min-h-screen" topOffset="0px">
        <LoginAlreadyAuthed
          showContinueButton={showContinueButton}
          isTargetDomainAuthorized={isTargetDomainAuthorized}
          isAuthed={isAuthed}
          onContinue={handleContinueClick}
          logoutPath="/admin/logout"
        >
          <LoginForm />
        </LoginAlreadyAuthed>
      </GoldenCentered>
    </Container>
  )
}

export default PageLogin
