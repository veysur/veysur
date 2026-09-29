import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { PASSWORD_MIN_LENGTH, validatePassword } from 'veysur-common'
import { Schema, sb } from '@datacapy/schema'

import { useAuth } from 'hook'
import { datacapyResolver } from 'common/hookform/datacapyResolver'
import { Button } from 'component/shadcn/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { PasswordTooltip } from 'component/PasswordTooltip'
import { FieldError } from 'component/Form'
import { PageHeader } from 'component/PageHeader'
import { AccountPageLayout } from 'appAccount/component/Layout'
import { RedirectPending } from 'model'
import { ErrorRest } from 'model/api'

import {
  useProjectAdminInviteAccept,
  useProjectAdminInviteAcceptNewAccount,
  useProjectAdminInviteDecline,
} from '../hook'
import { getProjectAdminInviteApi } from '../registry'

type CreateAccountFormData = {
  nameFirst: string
  nameLast: string
  password: string
  confirmPassword: string
}

const createAccountSchema = new Schema(
  sb
    .object()
    .shape({
      nameFirst: sb
        .string()
        .required({ message: 'First name is required' })
        .maxLength(64, { message: 'First name must be at most 64 characters' }),
      nameLast: sb
        .string()
        .required({ message: 'Last name is required' })
        .maxLength(64, { message: 'Last name must be at most 64 characters' }),
      password: sb
        .string()
        .required({ message: 'Password is required' })
        .minLength(PASSWORD_MIN_LENGTH, {
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        })
        .validate(validatePassword),
      confirmPassword: sb
        .string()
        .required({ message: 'Please confirm your password' })
        .validate((value, { root }) =>
          value === root?.password ? true : 'Passwords do not match',
        ),
    })
    .build(),
)

export const PageTeamInviteAccept: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isAuthed } = useAuth()

  const code = searchParams.get('code')
  const email = searchParams.get('email')

  // Anonymous visitors choose explicitly rather than the page guessing from
  // account existence - they may not want to use whichever account (if any)
  // already exists for the invited email.
  const [mode, setMode] = useState<'choice' | 'create'>('choice')
  const [createAccountError, setCreateAccountError] = useState<string | null>(
    null,
  )

  const {
    acceptInvite,
    isLoading: isAccepting,
    error: acceptError,
  } = useProjectAdminInviteAccept()
  const {
    declineInvite,
    isLoading: isDeclining,
    error: declineError,
  } = useProjectAdminInviteDecline()
  const { acceptNewAccount, isLoading: isCreatingAccount } =
    useProjectAdminInviteAcceptNewAccount()

  // Plain useQuery, not useAuthdQuery - this must work before login (no JWT
  // to refresh yet) as well as after.
  const {
    data: invite,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['teamInviteDetail', code, email],
    queryFn: async () => {
      if (!code || !email) throw new Error('Invalid invite link')
      return getProjectAdminInviteApi().getInviteDetail(code, email)
    },
    enabled: Boolean(code && email),
    retry: false,
  })

  const form = useForm<CreateAccountFormData>({
    resolver: datacapyResolver(createAccountSchema),
    defaultValues: {
      nameFirst: '',
      nameLast: '',
      password: '',
      confirmPassword: '',
    },
  })

  const handleAccept = async () => {
    if (!code || !email) return
    try {
      await acceptInvite({ code, email })
      navigate('/', { replace: true })
    } catch {
      // error displayed via acceptError
    }
  }

  const handleDecline = async () => {
    if (!code || !email) return
    try {
      await declineInvite({ code, email })
      navigate('/', { replace: true })
    } catch {
      // error displayed via declineError
    }
  }

  const handleLoginInstead = () => {
    RedirectPending.push('authGate', location.pathname + location.search)
    navigate('/login', { replace: true })
  }

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateAccountError(null)
    if (!code || !email) return

    const result = await form.trigger()
    if (!result) return

    const values = form.getValues()
    try {
      await acceptNewAccount({
        code,
        email,
        nameFirst: values.nameFirst,
        nameLast: values.nameLast,
        password: values.password,
      })
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ErrorRest && error.status === 403) {
        setCreateAccountError(
          'An account already exists for this email. Use "I already have an account" instead.',
        )
      } else if (error instanceof ErrorRest) {
        setCreateAccountError(error.userMessage)
      } else {
        setCreateAccountError('An unexpected error occurred')
      }
    }
  }

  const projectName = invite?.project?.name ?? 'this project'
  const inviterFirst = invite?.invitedBy?.nameFirst ?? ''
  const inviterLast = invite?.invitedBy?.nameLast ?? ''
  const inviterName =
    [inviterFirst, inviterLast].filter(Boolean).join(' ') || 'Someone'

  const errorMessage =
    !code || !email
      ? 'Invalid invite link. Please check the link in your email.'
      : ((queryError as Error)?.message ?? null)

  return (
    <AccountPageLayout>
      <PageHeader title="Team Invitation" />
      <div className="flex justify-center py-8">
        {isLoading ? (
          <Spinner />
        ) : errorMessage ? (
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>You&apos;ve been invited</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>{inviterName}</strong> has invited you to join{' '}
                <strong>{projectName}</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                Accepting will give you admin access to this project.
              </p>
              {!isAuthed && mode === 'create' && (
                <form className="space-y-3 pt-2" onSubmit={handleCreateAccount}>
                  <p className="text-sm text-muted-foreground">
                    Create your account for <strong>{email}</strong>.
                  </p>
                  <div className="grid gap-1">
                    <Label htmlFor="nameFirst">First Name</Label>
                    <Input
                      id="nameFirst"
                      type="text"
                      {...form.register('nameFirst')}
                    />
                    {form.formState.errors.nameFirst && (
                      <FieldError className="mt-1">
                        {form.formState.errors.nameFirst.message}
                      </FieldError>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="nameLast">Last Name</Label>
                    <Input
                      id="nameLast"
                      type="text"
                      {...form.register('nameLast')}
                    />
                    {form.formState.errors.nameLast && (
                      <FieldError className="mt-1">
                        {form.formState.errors.nameLast.message}
                      </FieldError>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="password">
                      Password
                      <PasswordTooltip />
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register('password')}
                    />
                    {form.formState.errors.password && (
                      <FieldError className="mt-1">
                        {form.formState.errors.password.message}
                      </FieldError>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...form.register('confirmPassword')}
                    />
                    {form.formState.errors.confirmPassword && (
                      <FieldError className="mt-1">
                        {form.formState.errors.confirmPassword.message}
                      </FieldError>
                    )}
                  </div>
                  {createAccountError && (
                    <Alert variant="destructive">
                      <AlertDescription>{createAccountError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setMode('choice')}
                      disabled={isCreatingAccount}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={isCreatingAccount}>
                      {isCreatingAccount
                        ? 'Creating account...'
                        : 'Create account & accept'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
            {(acceptError || declineError) && (
              <Alert variant="destructive" className="mx-6 mb-2">
                <AlertDescription>
                  {acceptError ?? declineError}
                </AlertDescription>
              </Alert>
            )}
            {isAuthed ? (
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={handleDecline}
                  disabled={isDeclining || isAccepting}
                >
                  {isDeclining ? 'Declining...' : 'Decline'}
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting || isDeclining}
                >
                  {isAccepting ? 'Accepting...' : 'Accept'}
                </Button>
              </CardFooter>
            ) : mode === 'choice' ? (
              <CardFooter className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => setMode('create')}>
                  Create an account
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleLoginInstead}
                >
                  I already have an account
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        )}
      </div>
    </AccountPageLayout>
  )
}

export default PageTeamInviteAccept
