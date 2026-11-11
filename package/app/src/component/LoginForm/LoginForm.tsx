import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { cn } from 'common/cn'
import { datacapyResolver } from 'common/hookform/datacapyResolver'
import { Button } from 'component/shadcn/button'
import { Card } from 'component/shadcn/card'
import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { FieldError } from 'component/Form'
import { TwoFactorSetupForm } from 'component/TwoFactorSetupForm'
import { TwoFactorVerifyForm } from 'component/TwoFactorVerifyForm'
import { useAccountBotCheck, useAuth } from 'hook'
import { ErrorRest } from 'model/api'
import { AuthDomain } from 'model'
import { getLoginDefaults } from 'registry'

type LoginFormData = {
  email: string
  password: string
}

type LoginView = 'credentials' | 'two-factor' | 'setup'

const loginSchema = new Schema(
  sb.object().shape({
    email: sb
      .string()
      .required({ message: 'Email is required' })
      .email({ message: 'Invalid email address' }),
    password: sb.string().required({ message: 'Password is required' }),
  }),
)

export const LoginForm: React.FC<React.ComponentProps<'div'>> = ({
  className,
  ...props
}) => {
  const { loginEmailPassword } = useAuth()
  const botCheck = useAccountBotCheck()
  const [formIsLoading, setFormIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [view, setView] = useState<LoginView>('credentials')
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null)
  const [loginDefaults] = useState(() => getLoginDefaults()())
  const autoSubmitted = useRef(false)
  const autoSigningIn = !!loginDefaults?.autoSubmit && !formError
  // cspell:ignore lpignore bwignore
  const passwordManagerOptOut = loginDefaults?.autoSubmit
    ? {
        'data-lpignore': 'true',
        'data-1p-ignore': true,
        'data-bwignore': 'true',
      }
    : {}

  const form = useForm<LoginFormData>({
    resolver: datacapyResolver(loginSchema),
    defaultValues: loginDefaults
      ? { email: loginDefaults.email, password: loginDefaults.password }
      : { email: '', password: '' },
  })

  const submit = async () => {
    setFormIsLoading(true)
    setFormError(null)

    const result = await form.trigger()
    if (!result) {
      setFormIsLoading(false)
      return
    }

    const values = form.getValues()

    AuthDomain.markLoginSubmitted()

    try {
      const loginResult = await loginEmailPassword(
        values.email,
        values.password,
        rememberMe,
        botCheck.take(),
      )
      if (
        loginResult !== true &&
        'requiresTwoFactor' in loginResult &&
        loginResult.requiresTwoFactor
      ) {
        setPreAuthToken(loginResult.preAuthToken)
        setView('two-factor')
      } else if (
        loginResult !== true &&
        'requiresTwoFactorSetup' in loginResult &&
        loginResult.requiresTwoFactorSetup
      ) {
        setPreAuthToken(loginResult.preAuthToken)
        setView('setup')
      }
    } catch (error) {
      AuthDomain.clearLoginSubmitted()
      if (error instanceof ErrorRest) {
        setFormError(error.userMessage)
      } else {
        setFormError('An unexpected error occurred')
      }
    }
    setFormIsLoading(false)
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    return submit()
  }

  useEffect(() => {
    if (!loginDefaults?.autoSubmit || autoSubmitted.current) return
    if (!botCheck.ready) return
    autoSubmitted.current = true
    // A password manager may have autofilled saved credentials over the defaults
    form.reset({ email: loginDefaults.email, password: loginDefaults.password })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sign-in once the bot check is ready, kicking off the async submit like a button press
    void submit()
  }, [botCheck.ready]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <Card className="overflow-hidden p-0">
        {view === 'two-factor' && preAuthToken ? (
          <TwoFactorVerifyForm
            preAuthToken={preAuthToken}
            rememberMe={rememberMe}
            onSuccess={() => {}}
            onCancel={() => {
              setView('credentials')
              setPreAuthToken(null)
            }}
          />
        ) : view === 'setup' && preAuthToken ? (
          <TwoFactorSetupForm
            preAuthToken={preAuthToken}
            rememberMe={rememberMe}
            onCancel={() => {
              setView('credentials')
              setPreAuthToken(null)
            }}
          />
        ) : (
          <>
            {autoSigningIn && (
              <div
                role="status"
                className="flex flex-col items-center justify-center gap-4 p-6 md:p-8 min-h-[400px]"
              >
                <Spinner size="lg" />
                {loginDefaults?.autoSubmitMessage && (
                  <p className="text-muted-foreground">
                    {loginDefaults.autoSubmitMessage}
                  </p>
                )}
              </div>
            )}
            <form
              className={cn(
                'flex items-center justify-center p-6 md:p-8 min-h-[400px]',
                autoSigningIn && 'hidden',
              )}
              onSubmit={onSubmit}
            >
              <div className="flex flex-col gap-6 w-full max-w-sm">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    Login to your account
                  </p>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    {...passwordManagerOptOut}
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <FieldError className="mt-1">
                      {form.formState.errors.email.message}
                    </FieldError>
                  )}
                </div>
                <div className="grid gap-1">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href={AuthDomain.getAccountUrl('password-reset')}
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    {...passwordManagerOptOut}
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && (
                    <FieldError className="mt-1">
                      {form.formState.errors.password.message}
                    </FieldError>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="font-normal cursor-pointer leading-none mb-0"
                  >
                    Remember me
                  </Label>
                </div>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                {botCheck.element}
                <Button
                  type="submit"
                  disabled={formIsLoading || !botCheck.ready}
                  className="w-full"
                >
                  {formIsLoading && <Spinner size="sm" className="mr-2" />}
                  Login
                </Button>
              </div>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
