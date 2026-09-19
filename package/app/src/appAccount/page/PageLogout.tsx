import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth, usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'
import { AuthDomain } from 'model'

export const PageLogout: React.FC = () => {
  usePageTitle('Logout', { suffix: 'Veysur' })
  const { logout } = useAuth()
  const { setFlashMessage } = useFlashMessage()
  const navigate = useNavigate()
  const hasLoggedOut = useRef(false)

  useEffect(() => {
    // Ensure logout logic only runs once
    if (hasLoggedOut.current) return
    hasLoggedOut.current = true

    // If on project domain, redirect to auth domain's logout
    if (AuthDomain.hasAuthDomain() && !AuthDomain.onAuthDomain()) {
      AuthDomain.handleLogout()
      logout()
      return
    }

    // On auth domain: clear auth, set flash, redirect to login
    logout()
    setFlashMessage('success', 'You are now logged out')

    // Preserve returnTo parameter for login page
    const urlParams = new URLSearchParams(window.location.search)
    const returnTo = urlParams.get('returnTo')
    const loginPath = returnTo
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/login'

    navigate(loginPath, { replace: true })
  }, [logout, setFlashMessage, navigate])

  // Show brief loading state while redirecting
  return (
    <div className="container-sm vh-100">
      <div className="row flex h-1/2 flex-col justify-center items-center">
        <div className="col-lg-4 col-md-6 col-sm-12 mx-auto flex justify-center">
          Logging out...
        </div>
      </div>
    </div>
  )
}

export default PageLogout
