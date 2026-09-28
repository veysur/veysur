import { useNavigate, Navigate } from 'react-router-dom'

import { Container } from 'component/shadcn/container'
import { GoldenCentered } from 'component/GoldenCentered'
import { useFlashMessage } from 'component/FlashMessage'
import { LoginForm } from 'component/LoginForm'
import { LoginAlreadyAuthed } from 'component/LoginAlreadyAuthed'
import { NavbarBrand } from 'component/Navbar'
import { AuthDomain } from 'model'
import { useAuth, usePageTitle, useAuthLoginRedirect } from 'hook'
import { queryClient } from 'common/queryClient'
import { KEY_STATE_AUTH } from 'common/keyState'
import { getLoginExtraContent } from 'registry'

// Resolved once at module scope, not inside the component — see
// AccountFooter.tsx for why (registry value is stable for the process
// lifetime; resolving it during render trips
// `react-hooks/static-components`).
const LoginExtraContent = getLoginExtraContent()

export const PageLogin: React.FC = () => {
  usePageTitle('Login', { suffix: 'Veysur' })
  useFlashMessage({ autoDisplay: true })
  const { isAuthed } = useAuth()
  const navigate = useNavigate()
  const {
    returnTo,
    sameOriginRedirect,
    effectiveAuth,
    effectiveIsAuthed,
    ensureFreshJwtAndHandleAuthed,
    isReturnToSameOrigin,
  } = useAuthLoginRedirect({
    checkRedirectPending: true,
  })

  const showContinueButton =
    effectiveIsAuthed && AuthDomain.onAuthDomain() && !!returnTo
  const isTargetDomainAuthorized =
    !!returnTo &&
    AuthDomain.isTargetDomainAuthorized(returnTo, effectiveAuth ?? undefined)

  const handleContinueClick = async () => {
    if (!returnTo) return

    let targetPath = returnTo
    const isSameOrigin = isReturnToSameOrigin(returnTo)
    if (isSameOrigin) {
      try {
        const url = new URL(returnTo)
        targetPath = url.pathname + (url.search ?? '')
      } catch {
        // returnTo is already a relative path
      }
    }

    if (isSameOrigin && effectiveAuth) {
      queryClient.setQueryData([KEY_STATE_AUTH], effectiveAuth)
      navigate(targetPath)
      return
    }

    await ensureFreshJwtAndHandleAuthed(effectiveAuth ?? undefined)
  }

  if (isAuthed && sameOriginRedirect) {
    return <Navigate to={sameOriginRedirect} replace />
  }

  return (
    <>
      <NavbarBrand
        href={window.location.origin.replace('//account.', '//www.')}
      />
      <Container className="my-5">
        <GoldenCentered className="min-h-[calc(100vh-4rem)]">
          <LoginAlreadyAuthed
            showContinueButton={showContinueButton}
            isTargetDomainAuthorized={isTargetDomainAuthorized}
            isAuthed={isAuthed}
            onContinue={handleContinueClick}
            logoutPath="/logout"
          >
            <LoginForm />
            <LoginExtraContent returnTo={returnTo} />
          </LoginAlreadyAuthed>
        </GoldenCentered>
      </Container>
    </>
  )
}

export default PageLogin
