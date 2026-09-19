import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Schema, sb } from 'mzen-schema'
import { useForm, useWatch } from 'react-hook-form'

import { mzenResolver } from 'common/hookform/mzenResolver'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Badge } from 'component/shadcn/badge'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { OtpInput } from 'component/OtpInput'
import { useFlashMessage } from 'component/FlashMessage'
import { FieldError } from 'component/Form'
import { useAuth, usePageTitle } from 'hook'
import { PageHeader } from 'component/PageHeader'
import { AccountPageLayout } from 'appAccount/component/Layout'

import { DisableTwoFactorFormData, TwoFactorSetupData } from '../model'
import { useUserTwoFactor, useUserProfileSchemas } from '../hook'

type SecurityView = 'status' | 'setup-qr' | 'setup-confirm' | 'confirm-disable'

type ConfirmFormData = {
  code: string
}

const confirmSchema = new Schema(
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

export const PageProfileSecurity: React.FC = () => {
  usePageTitle('Security', { suffix: 'Veysur' })
  const navigate = useNavigate()
  const { showFlashMessage } = useFlashMessage()
  const { auth } = useAuth()

  const {
    getSetupData,
    isLoadingSetup,
    enable,
    isEnabling,
    enableError,
    disable,
    isDisabling,
    disableError,
  } = useUserTwoFactor()

  const { schemaDisableTwoFactor } = useUserProfileSchemas()

  const [view, setView] = useState<SecurityView>('status')
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  const isTwoFactorEnabled = auth?.user?.twoFactorMeta?.enabled === true

  const confirmForm = useForm<ConfirmFormData>({
    resolver: mzenResolver(confirmSchema),
    defaultValues: { code: '' },
  })

  const disableForm = useForm<DisableTwoFactorFormData>({
    resolver: mzenResolver(schemaDisableTwoFactor),
    defaultValues: { password: '' },
  })

  const confirmFormCode = useWatch({
    control: confirmForm.control,
    name: 'code',
  })

  const handleStartSetup = async () => {
    try {
      const data = await getSetupData()
      setSetupData(data)
      setView('setup-qr')
    } catch {
      // error shown via isLoadingSetup / setupError
    }
  }

  const handleDisable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const isValid = await disableForm.trigger()
    if (!isValid) return

    const { password } = disableForm.getValues()
    try {
      await disable({ password })
      showFlashMessage('success', 'Two-factor authentication disabled')
      setView('status')
    } catch {
      // error shown via disableError
    }
  }

  const submitConfirmEnable = async () => {
    const isValid = await confirmForm.trigger()
    if (!isValid) return
    const { code } = confirmForm.getValues()
    try {
      await enable({ code, secret: setupData!.secret })
      showFlashMessage('success', 'Two-factor authentication enabled')
      navigate('/profile')
    } catch {
      // error shown via enableError
    }
  }

  const handleConfirmEnable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await submitConfirmEnable()
  }

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    }
  }

  return (
    <AccountPageLayout fluid>
      <PageHeader title="Security" backUrl="/profile" />
      <div className="max-w-2xl mx-auto">
        {view === 'status' && (
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Protect your account with an authenticator app (Google
                Authenticator, Authy, 1Password, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={isTwoFactorEnabled ? 'default' : 'secondary'}>
                  {isTwoFactorEnabled ? 'Enabled' : 'Not enabled'}
                </Badge>
                {isTwoFactorEnabled ? (
                  <Button
                    variant="destructive"
                    onClick={() => setView('confirm-disable')}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button onClick={handleStartSetup} disabled={isLoadingSetup}>
                    {isLoadingSetup && <Spinner size="sm" className="mr-2" />}
                    Enable
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'confirm-disable' && (
          <Card>
            <CardHeader>
              <CardTitle>Disable Two-Factor Authentication</CardTitle>
              <CardDescription>
                Enter your current password to confirm you want to disable
                two-factor authentication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDisable} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="disablePassword">Current Password</Label>
                  <Input
                    id="disablePassword"
                    type="password"
                    {...disableForm.register('password')}
                  />
                  {disableForm.formState.errors.password && (
                    <FieldError>
                      {disableForm.formState.errors.password.message}
                    </FieldError>
                  )}
                </div>
                {disableError && (
                  <Alert variant="destructive">
                    <AlertDescription>{disableError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setView('status')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={isDisabling}
                  >
                    {isDisabling && <Spinner size="sm" className="mr-2" />}
                    Disable
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {view === 'setup-qr' && setupData && (
          <Card>
            <CardHeader>
              <CardTitle>Scan QR Code</CardTitle>
              <CardDescription>
                Open your authenticator app and scan this QR code, or enter the
                secret key manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={setupData.otpauthUri} size={200} />
                </div>
              </div>
              <div className="space-y-2">
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
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setView('status')
                    setSetupData(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={() => setView('setup-confirm')}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'setup-confirm' && setupData && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app to confirm
                setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmEnable} className="space-y-6">
                <div className="space-y-3">
                  <OtpInput
                    value={confirmFormCode}
                    onChange={(val) =>
                      confirmForm.setValue('code', val, {
                        shouldValidate: confirmForm.formState.isSubmitted,
                      })
                    }
                    onComplete={submitConfirmEnable}
                    autoFocus
                    disabled={isEnabling}
                  />
                  {confirmForm.formState.errors.code && (
                    <div className="flex justify-center">
                      <FieldError>
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
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setView('setup-qr')}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isEnabling}>
                    {isEnabling && <Spinner size="sm" className="mr-2" />}
                    Verify and Enable
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AccountPageLayout>
  )
}

export default PageProfileSecurity
