import { Schema, sb } from 'mzen-schema'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { CheckCircle, Mail, Loader2 } from 'lucide-react'

import { mzenResolver } from 'common/hookform/mzenResolver'
import { Button } from 'component/shadcn/button'
import { Card } from 'component/shadcn/card'
import { Container } from 'component/shadcn/container'
import { GoldenCentered } from 'component/GoldenCentered'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { useFlashMessage } from 'component/FlashMessage'
import { FieldError } from 'component/Form'
import { NavbarBrand } from 'component/Navbar'
import { usePageTitle } from 'hook'
import { getRestClient } from 'registry'
import { ErrorRest } from 'model/api'

type EmailFormData = {
  email: string
}

type ResetFormData = {
  token: string
  password: string
  passwordConfirm: string
}

const emailSchema = new Schema(
  sb
    .object()
    .shape({
      email: sb
        .string()
        .required({ message: 'Email is required' })
        .email({ message: 'Invalid email address' }),
    })
    .build(),
)

const resetSchema = new Schema(
  sb
    .object()
    .shape({
      token: sb
        .string()
        .required({ message: 'Verification code is required' })
        .minLength(6, {
          message: 'Verification code must be at least 6 characters',
        }),
      password: sb
        .string()
        .required({ message: 'Password is required' })
        .minLength(8, {
          message: 'Password must be at least 8 characters',
        }),
      passwordConfirm: sb
        .string()
        .required({ message: 'Please confirm your password' }),
    })
    .build(),
)

type Step = 'request' | 'verify' | 'success'

const errorMessages: Record<string, string> = {
  USER_NOT_FOUND: 'No account found with this email address.',
  TOO_MANY_ATTEMPTS: 'Too many failed attempts. Please request a new code.',
  EXPIRED: 'This code has expired. Please request a new one.',
  INVALID_TOKEN: 'The verification code is incorrect.',
  EMAIL_FREQUENCY_LIMIT:
    'Too many emails sent recently. Please wait and try again.',
}

const PageLayout: React.FC<{
  children: React.ReactNode
  minHeight?: string
}> = ({ children, minHeight = 'min-h-[300px]' }) => (
  <>
    <NavbarBrand />
    <Container>
      <GoldenCentered className="min-h-[calc(100vh-4rem)]">
        <Card className="overflow-hidden p-0">
          <div
            className={`flex items-center justify-center p-6 md:p-8 ${minHeight}`}
          >
            {children}
          </div>
        </Card>
      </GoldenCentered>
    </Container>
  </>
)

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

export const PagePasswordReset: React.FC = () => {
  usePageTitle('Reset Password', { suffix: 'Veysur' })
  useFlashMessage({ autoDisplay: true })

  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const urlParams = new URLSearchParams(window.location.search)
  const emailFromUrl = urlParams.get('email')
  const tokenFromUrl = urlParams.get('token')

  const emailForm = useForm<EmailFormData>({
    resolver: mzenResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  })

  const resetForm = useForm<ResetFormData>({
    resolver: mzenResolver(resetSchema),
    defaultValues: {
      token: '',
      password: '',
      passwordConfirm: '',
    },
  })

  const sendResetEmail = async (emailAddress: string) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await getRestClient().post('password/reset-email', {
        email: emailAddress,
      })
      setEmail(emailAddress)
      setStep('verify')
    } catch (error) {
      const restError = ErrorRest.fromRequestError(error as Error)
      const message = errorMessages[restError.ref] || restError.userMessage
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetPassword = async (
    emailAddress: string,
    token: string,
    password: string,
  ) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await getRestClient().put('password/', {
        email: emailAddress,
        token,
        password,
      })
      setStep('success')
    } catch (error) {
      const restError = ErrorRest.fromRequestError(error as Error)
      const message = errorMessages[restError.ref] || restError.userMessage
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      await getRestClient().post('password/reset-email', {
        email,
      })
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (error) {
      const restError = ErrorRest.fromRequestError(error as Error)
      const message = errorMessages[restError.ref] || restError.userMessage
      setResendError(message)
    } finally {
      setIsResending(false)
    }
  }

  // Handle URL params - auto-fill and transition to verify step
  useEffect(() => {
    if (emailFromUrl && tokenFromUrl) {
      setEmail(emailFromUrl)
      resetForm.setValue('token', tokenFromUrl)
      setStep('verify')
    } else if (emailFromUrl) {
      setEmail(emailFromUrl)
      setStep('verify')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const result = await emailForm.trigger()
    if (!result) {
      return
    }

    const values = emailForm.getValues()
    await sendResetEmail(values.email)
  }

  const onResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const result = await resetForm.trigger()
    if (!result) {
      return
    }

    const values = resetForm.getValues()

    // Check passwords match
    if (values.password !== values.passwordConfirm) {
      resetForm.setError('passwordConfirm', {
        message: 'Passwords do not match',
      })
      return
    }

    await resetPassword(email, values.token, values.password)
  }

  // Loading state during auto-submit
  if (isSubmitting && step === 'request') {
    return (
      <PageLayout>
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Sending reset email...</p>
        </div>
      </PageLayout>
    )
  }

  // Success step
  if (step === 'success') {
    return (
      <PageLayout>
        <StatusMessage
          icon={<CheckCircle className="h-12 w-12 text-green-600" />}
          title="Password Reset!"
          description="Your password has been successfully reset."
        >
          <Link to="/login">
            <Button className="w-full">Continue to Login</Button>
          </Link>
        </StatusMessage>
      </PageLayout>
    )
  }

  // Verify step - token and new password form
  if (step === 'verify') {
    return (
      <PageLayout minHeight="min-h-[500px]">
        <form
          className="flex flex-col gap-6 w-full max-w-sm"
          onSubmit={onResetSubmit}
        >
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">Set New Password</h1>
            <p className="text-balance text-muted-foreground">
              Enter the code from your email and choose a new password
            </p>
          </div>
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div className="text-sm text-muted-foreground">
            Resetting password for:{' '}
            <span className="font-medium text-foreground">{email}</span>
          </div>
          <div className="flex flex-col gap-2">
            {resendSuccess && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Reset email sent! Check your inbox.
                </AlertDescription>
              </Alert>
            )}
            {resendError && (
              <Alert variant="destructive">
                <AlertDescription>{resendError}</AlertDescription>
              </Alert>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Resend Reset Email
                </>
              )}
            </Button>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="token">Verification Code</Label>
            <Input
              id="token"
              type="text"
              placeholder="Enter your verification code"
              {...resetForm.register('token')}
            />
            {resetForm.formState.errors.token && (
              <FieldError className="mt-1">
                {resetForm.formState.errors.token.message}
              </FieldError>
            )}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              {...resetForm.register('password')}
            />
            {resetForm.formState.errors.password && (
              <FieldError className="mt-1">
                {resetForm.formState.errors.password.message}
              </FieldError>
            )}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="passwordConfirm">Confirm Password</Label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="Confirm new password"
              {...resetForm.register('passwordConfirm')}
            />
            {resetForm.formState.errors.passwordConfirm && (
              <FieldError className="mt-1">
                {resetForm.formState.errors.passwordConfirm.message}
              </FieldError>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Spinner size="sm" className="mr-2" />}
            Reset Password
          </Button>
          <div className="text-center text-sm">
            <Link to="/login" className="underline underline-offset-4">
              Back to Login
            </Link>
          </div>
        </form>
      </PageLayout>
    )
  }

  // Request step - email form
  return (
    <PageLayout minHeight="min-h-[350px]">
      <form
        className="flex flex-col gap-6 w-full max-w-sm"
        onSubmit={onEmailSubmit}
      >
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">Reset Your Password</h1>
          <p className="text-balance text-muted-foreground">
            Enter your email and we&apos;ll send you a reset code
          </p>
        </div>
        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            {...emailForm.register('email')}
          />
          {emailForm.formState.errors.email && (
            <FieldError className="mt-1">
              {emailForm.formState.errors.email.message}
            </FieldError>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner size="sm" className="mr-2" />}
          Send Reset Email
        </Button>
        <div className="text-center text-sm">
          <Link to="/login" className="underline underline-offset-4">
            Back to Login
          </Link>
        </div>
      </form>
    </PageLayout>
  )
}

export default PagePasswordReset
