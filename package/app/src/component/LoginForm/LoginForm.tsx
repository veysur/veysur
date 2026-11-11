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

  const { autoSigningIn, passwordManagerOptOut } = useLoginAutoSubmit({
    loginDefaults,
    botReady: botCheck.ready,
    formError,
    resetForm: form.reset,
    submit,
  })

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
        )}
      </Card>
    </div>
  )
}
