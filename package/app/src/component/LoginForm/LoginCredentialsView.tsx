import type { UseFormReturn } from 'react-hook-form'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { FieldError } from 'component/Form'
import { AuthDomain } from 'model'

export type LoginFormData = {
  email: string
  password: string
}

type Props = {
  form: UseFormReturn<LoginFormData>
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  autoSigningIn: boolean
  autoSubmitMessage?: string
  passwordManagerOptOut: Record<string, string | boolean>
  rememberMe: boolean
  onRememberMeChange: (rememberMe: boolean) => void
  formError: string | null
  formIsLoading: boolean
  botCheckElement: React.ReactNode
  botCheckReady: boolean
}

/** The form stays mounted (hidden) while auto-signing in: the auto-submit hook needs its registered fields. */
export const LoginCredentialsView: React.FC<Props> = ({
  form,
  onSubmit,
  autoSigningIn,
  autoSubmitMessage,
  passwordManagerOptOut,
  rememberMe,
  onRememberMeChange,
  formError,
  formIsLoading,
  botCheckElement,
  botCheckReady,
}) => (
  <>
    {autoSigningIn && (
      <div
        role="status"
        className="flex flex-col items-center justify-center gap-4 p-6 md:p-8 min-h-[400px]"
      >
        <Spinner size="lg" />
        {autoSubmitMessage && (
          <p className="text-muted-foreground">{autoSubmitMessage}</p>
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
            onCheckedChange={(checked) => onRememberMeChange(checked === true)}
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
        {botCheckElement}
        <Button
          type="submit"
          disabled={formIsLoading || !botCheckReady}
          className="w-full"
        >
          {formIsLoading && <Spinner size="sm" className="mr-2" />}
          Login
        </Button>
      </div>
    </form>
  </>
)
