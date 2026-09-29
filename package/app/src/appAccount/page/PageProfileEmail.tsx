import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'

import { datacapyResolver } from 'common/hookform/datacapyResolver'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { useFlashMessage } from 'component/FlashMessage'
import { FieldError } from 'component/Form'
import { usePageTitle } from 'hook'
import { PageHeader } from 'component/PageHeader'
import { AccountPageLayout } from 'appAccount/component/Layout'

import { UserProfileEmailFormData } from '../model'
import { useUserProfileEmail, useUserProfileSchemas } from '../hook'

export const PageProfileEmail: React.FC = () => {
  usePageTitle('Change Email Address', { suffix: 'Veysur' })
  const navigate = useNavigate()
  const { showFlashMessage } = useFlashMessage()

  const { schemaUserProfileEmail } = useUserProfileSchemas()
  const { updateEmail, isLoading, error } = useUserProfileEmail()

  const form = useForm<UserProfileEmailFormData>({
    resolver: datacapyResolver(schemaUserProfileEmail),
    defaultValues: {
      email: '',
      currentPassword: '',
    },
  })

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const result = await form.trigger()
    if (!result) return

    const values = form.getValues()

    try {
      await updateEmail(values)
      showFlashMessage('success', 'Email updated successfully.')
      navigate('/profile')
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <AccountPageLayout fluid>
      <PageHeader title="Change Email Address" backUrl="/profile" />
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Change Email Address</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit}>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="m@example.com"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <FieldError>
                      {form.formState.errors.email.message}
                    </FieldError>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...form.register('currentPassword')}
                  />
                  {form.formState.errors.currentPassword && (
                    <FieldError>
                      {form.formState.errors.currentPassword.message}
                    </FieldError>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Alert>
                  <AlertDescription>
                    After changing your email, you will need to verify your new
                    email address.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Spinner size="sm" className="mr-2" />}
                    Change Email
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AccountPageLayout>
  )
}

export default PageProfileEmail
