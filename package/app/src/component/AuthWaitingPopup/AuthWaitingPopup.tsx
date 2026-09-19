import { useEffect, useState } from 'react'
import { Spinner } from 'component/shadcn/spinner'
import { Container } from 'component/shadcn/container'
import { GoldenCentered } from 'component/GoldenCentered'
import { Button } from 'component/shadcn/button'
import { AuthDomainPopup } from 'model'

const TIMEOUT_MS = 30_000

/**
 * AuthWaitingPopup
 *
 * Displayed in popup windows during cross-domain authentication.
 * Prevents user interaction while waiting for auth to complete.
 * The popup will be closed automatically by the auth domain window.
 * Shows an error state after TIMEOUT_MS if auth has not completed.
 */
export const AuthWaitingPopup: React.FC = () => {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const authDomain =
      process.env.PUBLIC_AUTHENTICATION_DOMAIN ||
      window.location.host.split(':')[0]

    AuthDomainPopup.readAuthMessage(() => {
      AuthDomainPopup.signalAuthComplete()
      // Self-close after signalling completion. On mobile, window.open() creates
      // a new tab and the opener's close() call is silently ignored by the browser.
      // Calling window.close() from within the popup itself is always permitted.
      setTimeout(() => window.close(), 100)
    }, authDomain)

    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Container fluid>
      <GoldenCentered className="min-h-screen" topOffset="0px">
        <div className="text-center space-y-4">
          {timedOut ? (
            <>
              <h2 className="text-2xl font-semibold">Authentication Failed</h2>
              <p className="text-muted-foreground">
                Authentication took too long. Please close this window and try
                again.
              </p>
              <Button variant="outline" onClick={() => window.close()}>
                Close this window
              </Button>
            </>
          ) : (
            <>
              <Spinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-2xl font-semibold">Authenticating</h2>
              <p className="text-muted-foreground">
                Please wait while we complete your login.
              </p>
              <p className="text-muted-foreground text-sm">
                This window will close automatically.
              </p>
            </>
          )}
        </div>
      </GoldenCentered>
    </Container>
  )
}

export default AuthWaitingPopup
