import { Schema, sb } from 'mzen-schema'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { QRCodeSVG } from 'qrcode.react'

import { cn } from 'common/cn'
import { mzenResolver } from 'common/hookform/mzenResolver'
import { Button } from 'component/shadcn/button'
import { Card } from 'component/shadcn/card'
import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { OtpInput } from 'component/OtpInput'
import { FieldError } from 'component/Form'
import { TwoFactorVerifyForm } from 'component/TwoFactorVerifyForm'
import { useAuth } from 'hook'
import { ErrorRest } from 'model/api'
import { AuthDomain } from 'model'
import { getApiAuth } from 'registry'

type LoginFormData = {
  email: string
  password: string
}

type SetupConfirmFormData = {
  code: string
}

type LoginView = 'credentials' | 'two-factor' | 'setup-qr' | 'setup-confirm'

const loginSchema = new Schema(
  sb
    .object()
    .shape({
      email: sb
        .string()
        .required({ message: 'Email is required' })
        .email({ message: 'Invalid email address' }),
      password: sb.string().required({ message: 'Password is required' }),
    })
    .build(),
)

const setupConfirmSchema = new Schema(
  sb
    .object()
    .shape({
      code: sb
        .string()
        .required({ message: 'Code is required' })
        .minLength(6, { message: 'Code must be 6 digits' })
        .maxLength(6, { message: 'Code must be 6 digits' }),
    })
    .build(),
)

export const LoginForm: React.FC<React.ComponentProps<'div'>> = ({
  className,
  ...props
}) => {
  const { loginEmailPassword, setupAndLogin } = useAuth()
  const [formIsLoading, setFormIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [view, setView] = useState<LoginView>('credentials')
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null)
  const [setupData, setSetupData] = useState<{
    secret: string
    otpauthUri: string
  } | null>(null)
  const [setupLoadError, setSetupLoadError] = useState<string | null>(null)
  const [setupIsLoading, setSetupIsLoading] = useState(false)
  const [isEnabling, setIsEnabling] = useState(false)
  const [enableError, setEnableError] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: mzenResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const confirmForm = useForm<SetupConfirmFormData>({
    resolver: mzenResolver(setupConfirmSchema),
    defaultValues: { code: '' },
  })

  const confirmFormCode = useWatch({
    control: confirmForm.control,
    name: 'code',
  })

  useEffect(() => {
    if (view !== 'setup-qr' || !preAuthToken) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a loading flag before kicking off the async setup-data fetch, not deriving state from a prop
    setSetupIsLoading(true)
    setSetupLoadError(null)
    getApiAuth()
      .getSetupDataForced(preAuthToken)
      .then((data: { secret: string; otpauthUri: string }) => {
        setSetupData(data)
      })
      .catch((error: unknown) => {
        setSetupLoadError(
          error instanceof ErrorRest
            ? error.userMessage
            : 'Failed to load setup data',
        )
      })
      .finally(() => setSetupIsLoading(false))
  }, [view, preAuthToken])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
        setView('setup-qr')
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

  const submitSetupConfirm = async () => {
    const isValid = await confirmForm.trigger()
    if (!isValid) return
    const { code } = confirmForm.getValues()
    setEnableError(null)
    setIsEnabling(true)
    try {
      await setupAndLogin(preAuthToken!, code, setupData!.secret, rememberMe)
    } catch (error) {
      setEnableError(
        error instanceof ErrorRest
          ? error.userMessage
          : 'Invalid code. Please try again.',
      )
    }
    setIsEnabling(false)
  }

  const cancelSetup = () => {
    setView('credentials')
    setPreAuthToken(null)
    setSetupData(null)
    confirmForm.reset()
  }

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    }
  }

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
        ) : view === 'setup-qr' ? (
          <div className="flex items-center justify-center p-6 md:p-8 min-h-[400px]">
            <div className="flex flex-col gap-6 w-full max-w-sm">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">
                  Set Up Two-Factor Authentication
                </h1>
                <p className="text-balance text-muted-foreground">
                  Your account requires 2FA. Scan the QR code with your
                  authenticator app.
                </p>
              </div>
              {setupIsLoading && (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              )}
              {setupLoadError && (
                <Alert variant="destructive">
                  <AlertDescription>{setupLoadError}</AlertDescription>
                </Alert>
              )}
              {setupData && (
                <>
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG value={setupData.otpauthUri} size={180} />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label>Secret Key (manual entry)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={setupData.secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopySecret}
                        className="shrink-0"
                      >
                        {secretCopied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={() => setView('setup-confirm')}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={cancelSetup}
                className="w-full"
              >
                Back to login
              </Button>
            </div>
          </div>
        ) : view === 'setup-confirm' ? (
          <form
            className="flex items-center justify-center p-6 md:p-8 min-h-[400px]"
            onSubmit={(e) => {
              e.preventDefault()
              submitSetupConfirm()
            }}
          >
            <div className="flex flex-col gap-6 w-full max-w-sm">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">
                  Two-Factor Authentication
                </h1>
                <p className="text-balance text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to confirm
                  setup
                </p>
              </div>
              <div className="grid gap-1">
                <OtpInput
                  value={confirmFormCode}
                  onChange={(val) =>
                    confirmForm.setValue('code', val, {
                      shouldValidate: confirmForm.formState.isSubmitted,
                    })
                  }
                  onComplete={submitSetupConfirm}
                  autoFocus
                  disabled={isEnabling}
                />
                {confirmForm.formState.errors.code && (
                  <div className="flex justify-center">
                    <FieldError className="mt-1">
                      {confirmForm.formState.errors.code.message}
                    </FieldError>
                  </div>
                )}
              </div>
              {enableError && (
                <Alert variant="destructive">
                  <AlertDescription>{enableError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={isEnabling} className="w-full">
                {isEnabling && <Spinner size="sm" className="mr-2" />}
                Verify and Enable
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView('setup-qr')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="flex items-center justify-center p-6 md:p-8 min-h-[400px]"
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
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
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
              <Button type="submit" disabled={formIsLoading} className="w-full">
                {formIsLoading && <Spinner size="sm" className="mr-2" />}
                Login
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
