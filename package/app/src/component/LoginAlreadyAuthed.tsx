import { useNavigate } from 'react-router-dom'

import { Button } from 'component/shadcn/button'

type Props = {
  showContinueButton: boolean
  isTargetDomainAuthorized: boolean | string | null | undefined
  isAuthed: boolean
  onContinue: () => void
  logoutPath: string
  children: React.ReactNode
}

export const LoginAlreadyAuthed: React.FC<Props> = ({
  showContinueButton,
  isTargetDomainAuthorized,
  isAuthed,
  onContinue,
  logoutPath,
  children,
}) => {
  const navigate = useNavigate()

  if (showContinueButton) {
    if (isTargetDomainAuthorized) {
      return (
        <div className="text-center space-y-4">
          <p>You are already logged in.</p>
          <p className="text-muted-foreground text-sm">
            Click below to continue to your project
          </p>
          <Button onClick={onContinue}>Continue</Button>
        </div>
      )
    }

    return (
      <div className="text-center space-y-4">
        <p className="text-destructive">
          The domain you are trying to access is not one of your authenticated
          domains.
        </p>
        <p className="text-muted-foreground text-sm">
          Please try logging out first and logging in directly on your target
          domain.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            navigate(logoutPath)
          }}
        >
          Logout
        </Button>
      </div>
    )
  }

  if (isAuthed) {
    return (
      <p>
        Your session was opened in a new tab. Ensure your browser is not
        blocking popups from this website.
      </p>
    )
  }

  return <>{children}</>
}
