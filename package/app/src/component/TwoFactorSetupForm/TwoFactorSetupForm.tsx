import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { QRCodeSVG } from 'qrcode.react'

import { datacapyResolver } from 'common/hookform/datacapyResolver'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { AuthFormLayout } from 'component/AuthFormLayout'
import { OtpInput } from 'component/OtpInput'
import { FieldError } from 'component/Form'
import { useAuth } from 'hook'
import { ErrorRest } from 'model/api'
import { getApiAuth } from 'registry'

type SetupConfirmFormData = {
  code: string
}

type SetupData = {
  secret: string
  otpauthUri: string
}

type Props = {
  preAuthToken: string
  rememberMe: boolean
  onCancel: () => void
}

const setupConfirmSchema = new Schema(
  sb.object().shape({
    code: sb
      .string()
      .required({ message: 'Code is required' })
      .minLength(6, { message: 'Code must be 6 digits' })
      .maxLength(6, { message: 'Code must be 6 digits' }),
  }),
)

export const TwoFactorSetupForm: React.FC<Props> = ({
  preAuthToken,
  rememberMe,
  onCancel,
}) => {
  const { setupAndLogin } = useAuth()
  const [step, setStep] = useState<'qr' | 'confirm'>('qr')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [setupLoadError, setSetupLoadError] = useState<string | null>(null)
  const [setupIsLoading, setSetupIsLoading] = useState(false)
  const [isEnabling, setIsEnabling] = useState(false)
  const [enableError, setEnableError] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  const confirmForm = useForm<SetupConfirmFormData>({
    resolver: datacapyResolver(setupConfirmSchema),
    defaultValues: { code: '' },
  })

  const confirmFormCode = useWatch({
    control: confirmForm.control,
    name: 'code',
  })

  useEffect(() => {
    if (step !== 'qr') return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a loading flag before kicking off the async setup-data fetch, not deriving state from a prop
    setSetupIsLoading(true)
    setSetupLoadError(null)
    getApiAuth()
      .getSetupDataForced(preAuthToken)
      .then((data: SetupData) => {
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
  }, [step, preAuthToken])

  const submitSetupConfirm = async () => {
    const isValid = await confirmForm.trigger()
    if (!isValid || !setupData) return
    const { code } = confirmForm.getValues()
    setEnableError(null)
    setIsEnabling(true)
    try {
      await setupAndLogin(preAuthToken, code, setupData.secret, rememberMe)
    } catch (error) {
      setEnableError(
        error instanceof ErrorRest
          ? error.userMessage
          : 'Invalid code. Please try again.',
      )
    }
    setIsEnabling(false)
  }

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    }
  }

  if (step === 'confirm') {
    return (
      <AuthFormLayout
        title="Two-Factor Authentication"
        description="Enter the 6-digit code from your authenticator app to confirm
              setup"
        onSubmit={(e) => {
          e.preventDefault()
          submitSetupConfirm()
        }}
      >
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
          onClick={() => setStep('qr')}
          className="w-full"
        >
          Back
        </Button>
      </AuthFormLayout>
    )
  }

  return (
    <AuthFormLayout
      title="Set Up Two-Factor Authentication"
      description="Your account requires 2FA. Scan the QR code with your authenticator
            app."
    >
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
          <Button onClick={() => setStep('confirm')} className="w-full">
            Continue
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        className="w-full"
      >
        Back to login
      </Button>
    </AuthFormLayout>
  )
}
