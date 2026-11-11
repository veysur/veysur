import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { cn } from 'common/cn'
import { datacapyResolver } from 'common/hookform/datacapyResolver'
import { Card } from 'component/shadcn/card'
import { TwoFactorSetupForm } from 'component/TwoFactorSetupForm'
import { TwoFactorVerifyForm } from 'component/TwoFactorVerifyForm'
import { useAccountBotCheck, useAuth } from 'hook'
import { ErrorRest } from 'model/api'
import { AuthDomain } from 'model'
import { getLoginDefaults } from 'registry'

import {
  LoginCredentialsView,
  type LoginFormData,
} from './LoginCredentialsView'
import { useLoginAutoSubmit } from './useLoginAutoSubmit'

type LoginStep =
  | { view: 'credentials' }
  | { view: 'two-factor' | 'setup'; preAuthToken: string }

const CREDENTIALS_STEP: LoginStep = { view: 'credentials' }

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
  const [step, setStep] = useState<LoginStep>(CREDENTIALS_STEP)
  const [loginDefaults] = useState(() => getLoginDefaults()())
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
        setStep({
          view: 'two-factor',
          preAuthToken: loginResult.preAuthToken,
        })
      } else if (
        loginResult !== true &&
        'requiresTwoFactorSetup' in loginResult &&
        loginResult.requiresTwoFactorSetup
      ) {
        setStep({ view: 'setup', preAuthToken: loginResult.preAuthToken })
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

  const { autoSigningIn, passwordManagerOptOut } = useLoginAutoSubmit({
    loginDefaults,
    botReady: botCheck.ready,
    formError,
    resetForm: form.reset,
    submit,
  })

  const backToCredentials = () => setStep(CREDENTIALS_STEP)

  const renderStep = () => {
    switch (step.view) {
      case 'two-factor':
        return (
          <TwoFactorVerifyForm
            preAuthToken={step.preAuthToken}
            rememberMe={rememberMe}
            onSuccess={() => {}}
            onCancel={backToCredentials}
          />
        )
      case 'setup':
        return (
          <TwoFactorSetupForm
            preAuthToken={step.preAuthToken}
            rememberMe={rememberMe}
            onCancel={backToCredentials}
          />
        )
      case 'credentials':
        return (
          <LoginCredentialsView
            form={form}
            onSubmit={onSubmit}
            autoSigningIn={autoSigningIn}
            autoSubmitMessage={loginDefaults?.autoSubmitMessage}
            passwordManagerOptOut={passwordManagerOptOut}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
            formError={formError}
            formIsLoading={formIsLoading}
            botCheckElement={botCheck.element}
            botCheckReady={botCheck.ready}
          />
        )
    }
  }

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <Card className="overflow-hidden p-0">{renderStep()}</Card>
    </div>
  )
}
