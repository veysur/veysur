import { Schema, sb } from 'mzen-schema'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { mzenResolver } from 'common/hookform/mzenResolver'
import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { OtpInput } from 'component/OtpInput'
import { FieldError } from 'component/Form'
import { useAuth } from 'hook'
import { ErrorRest } from 'model/api'

type TwoFactorFormData = {
  code: string
}

const twoFactorSchema = new Schema(
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

type Props = {
  preAuthToken: string
  rememberMe: boolean
  onSuccess: () => void
  onCancel: () => void
}

export const TwoFactorVerifyForm: React.FC<Props> = ({
  preAuthToken,
  rememberMe,
  onSuccess,
  onCancel,
}) => {
  const { verifyTwoFactor } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TwoFactorFormData>({
    resolver: mzenResolver(twoFactorSchema),
    defaultValues: { code: '' },
  })

  const formCode = useWatch({ control: form.control, name: 'code' })

  const submit = async () => {
    setIsLoading(true)
    setFormError(null)

    const isValid = await form.trigger()
    if (!isValid) {
      setIsLoading(false)
      return
    }

    const { code } = form.getValues()
    try {
      await verifyTwoFactor(preAuthToken, code, rememberMe)
      onSuccess()
    } catch (error) {
      if (error instanceof ErrorRest) {
        setFormError(error.userMessage)
      } else {
        setFormError('An unexpected error occurred')
      }
    }
    setIsLoading(false)
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submit()
  }

  return (
    <form
      className="flex items-center justify-center p-6 md:p-8 min-h-[400px]"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
          <p className="text-balance text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
        <div className="grid gap-1">
          <OtpInput
            value={formCode}
            onChange={(val) =>
              form.setValue('code', val, {
                shouldValidate: form.formState.isSubmitted,
              })
            }
            onComplete={submit}
            autoFocus
            disabled={isLoading}
          />
          {form.formState.errors.code && (
            <div className="flex justify-center">
              <FieldError className="mt-1">
                {form.formState.errors.code.message}
              </FieldError>
            </div>
          )}
        </div>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Spinner size="sm" className="mr-2" />}
          Verify
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="w-full"
        >
          Back to login
        </Button>
      </div>
    </form>
  )
}

export default TwoFactorVerifyForm
