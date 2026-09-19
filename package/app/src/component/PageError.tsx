import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import { useRouteError, useNavigate } from 'react-router-dom'

import { Button } from 'component/shadcn/button'
import { Container } from 'component/shadcn/container'
import { GoldenCentered } from 'component/GoldenCentered'
import { usePageTitle } from 'hook'

export const PageError: React.FC = () => {
  usePageTitle('Something went wrong')
  const navigate = useNavigate()
  const error = useRouteError()

  useEffect(() => {
    if (error instanceof Error) {
      Sentry.captureException(error)
    }
  }, [error])

  const message =
    import.meta.env.DEV && error instanceof Error ? error.message : null

  return (
    <Container>
      <GoldenCentered className="min-h-screen" topOffset="0px">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Try again or go back home.
          </p>
          {message && (
            <p className="text-sm text-destructive font-mono">{message}</p>
          )}
          <div className="flex justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
            <Button onClick={() => navigate('/')}>Go home</Button>
          </div>
        </div>
      </GoldenCentered>
    </Container>
  )
}

export default PageError
