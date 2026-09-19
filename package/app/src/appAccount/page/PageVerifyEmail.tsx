import { Schema, sb } from 'mzen-schema'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Mail, Loader2 } from 'lucide-react'

import { mzenResolver } from 'common/hookform/mzenResolver'
import { useAuth } from 'hook/useAuth'
import { Button } from 'component/shadcn/button'
import { Card, CardContent } from 'component/shadcn/card'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { OtpInput } from 'component/OtpInput'
import { Spinner } from 'component/shadcn/spinner'
import { useFlashMessage } from 'component/FlashMessage'
import { FieldError } from 'component/Form'
import { AccountPageLayout } from 'appAccount/component/Layout'
import { usePageTitle } from 'hook'
import { getRestClient } from 'registry'
import { ErrorRest } from 'model/api'
import { RedirectPending } from 'model'

const RESEND_SUCCESS_MESSAGE_TIMEOUT_MS = 5000

type TokenFormData = {
  token: string
}

const tokenSchema = new Schema(
  sb
    .object()
    .shape({
      token: sb
        .string()
        .required({ message: 'Verification code is required' })
        .minLength(6, { message: 'Code must be 6 digits' })
        .maxLength(6, { message: 'Code must be 6 digits' }),
    })
    .build(),
)

type VerifyStatus = 'pending' | 'verifying' | 'success' | 'error'

const errorMessages: Record<string, string> = {
  INVALID_TOKEN: 'The verification code is incorrect.',
  EXPIRED: 'This verification code has expired.',
  MAX_ATTEMPTS:
    'Too many failed attempts. Please request a new verification code.',
  EMAIL_FREQUENCY_LIMIT:
    'Too many emails sent recently. Please wait a few minutes and try again.',
}

const StatusMessage: React.FC<{
  icon?: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}> = ({ icon, title, description, children }) => (
  <div className="flex flex-col gap-6 w-full max-w-sm text-center">
    <div className="flex flex-col items-center gap-2">
      {icon}
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
    {children}
  </div>
)

export const PageVerifyEmail: React.FC = () => {
  usePageTitle('Verify Email', { suffix: 'Veysur' })
  useFlashMessage({ autoDisplay: true })
  const { auth, authRefresh } = useAuth()
  const navigate = useNavigate()

  const [status, setStatus] = useState<VerifyStatus>('pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const urlParams = new URLSearchParams(window.location.search)
  const emailFromUrl = urlParams.get('email')
  const email = emailFromUrl || auth?.user?.email
  const tokenFromUrl = urlParams.get('token')

  const form = useForm<TokenFormData>({
    resolver: mzenResolver(tokenSchema),
    defaultValues: {
      token: '',
    },
  })

  const verifyEmail = async (emailAddress: string, token: string) => {
    setStatus('verifying')
    setErrorMessage(null)

    try {
      await getRestClient().post('verify-email/verify', {
        email: emailAddress,
        token,
      })
      // Refresh auth data to get updated email verification status
      await authRefresh(true)
      setStatus('success')
    } catch (error) {
      setStatus('error')
      const restError = ErrorRest.fromRequestError(error as Error)
      const message = errorMessages[restError.ref] || restError.userMessage
      setErrorMessage(message)
    }
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      await getRestClient().get('verify-email/send')
      setResendSuccess(true)
      setTimeout(
        () => setResendSuccess(false),
        RESEND_SUCCESS_MESSAGE_TIMEOUT_MS,
      )
    } catch (error) {
      const restError = ErrorRest.fromRequestError(error as Error)
      const message =
        errorMessages[restError.ref] ||
        'Failed to send verification email. Please try again later.'
      setResendError(message)
    } finally {
      setIsResending(false)
    }
  }

  useEffect(() => {
    if (email && tokenFromUrl) {
      verifyEmail(email, tokenFromUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submitVerify = async () => {
    const isValid = await form.trigger()
    if (!isValid) return
    const { token } = form.getValues()
    if (email) await verifyEmail(email, token)
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submitVerify()
  }

  return (
    <AccountPageLayout nav={false} suppressTwoFactorPrompt>
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        {!email ? (
          <StatusMessage
            title="Invalid Link"
            description="This verification link is invalid. Please check the link in your email and try again."
          >
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Back
              </Button>
            </Link>
          </StatusMessage>
        ) : status === 'verifying' ? (
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </div>
        ) : status === 'success' ? (
          <StatusMessage
            icon={<CheckCircle className="h-12 w-12 text-green-600" />}
            title="Email Verified!"
            description="Your email has been verified."
          >
            {auth ? (
              <Button
                className="w-full"
                onClick={() =>
                  navigate(RedirectPending.remove('authGate') ?? '/')
                }
              >
                Continue
              </Button>
            ) : (
              <Link to="/login">
                <Button className="w-full">Continue</Button>
              </Link>
            )}
          </StatusMessage>
        ) : (
          <Card className="w-full max-w-lg mx-auto">
            <CardContent>
              <form className="flex flex-col gap-6 w-full" onSubmit={onSubmit}>
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Verify Your Email</h1>
                  <p className="text-balance text-muted-foreground">
                    Enter the code sent to your email
                  </p>
                </div>
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                <div className="text-sm text-muted-foreground text-center">
                  Code sent to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </div>
                <div className="grid gap-1">
                  <OtpInput
                    value={form.watch('token')}
                    onChange={(val) =>
                      form.setValue('token', val, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                    onComplete={submitVerify}
                    autoFocus
                  />
                  {form.formState.errors.token && (
                    <div className="flex justify-center">
                      <FieldError className="mt-1">
                        {form.formState.errors.token.message}
                      </FieldError>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Verify Email
                </Button>
                {auth?.user && (
                  <div className="flex flex-col items-center gap-2">
                    {resendSuccess && (
                      <p className="text-sm text-muted-foreground">
                        <Mail className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
                        Verification email sent! Check your inbox.
                      </p>
                    )}
                    {resendError && (
                      <Alert variant="destructive">
                        <AlertDescription>{resendError}</AlertDescription>
                      </Alert>
                    )}
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={isResending}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="inline h-3.5 w-3.5 mr-1 animate-spin align-text-bottom" />
                          Sending...
                        </>
                      ) : (
                        "Didn't receive a code? Resend"
                      )}
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AccountPageLayout>
  )
}

export default PageVerifyEmail
