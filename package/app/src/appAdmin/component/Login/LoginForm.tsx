import { Schema, sb } from '@datacapy/schema'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { cn } from 'common/cn'
import { datacapyResolver } from 'common/hookform/datacapyResolver'
import { Button } from 'component/shadcn/button'
import { Card } from 'component/shadcn/card'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { FieldError } from 'component/Form'
import { useAuth } from 'hook'
import { ErrorRest } from 'model/api'
import { AuthDomain } from 'model'

type LoginFormData = {
  email: string
  password: string
}

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

export const LoginForm: React.FC<React.ComponentProps<'div'>> = ({
  className,
  ...props
}) => {
  const { loginEmailPassword } = useAuth()
  const [formIsLoading, setFormIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginFormData>({
    resolver: datacapyResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

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
      await loginEmailPassword(values.email, values.password)
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

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <Card className="overflow-hidden p-0">
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
      </Card>
    </div>
  )
}
