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
import { PasswordTooltip } from 'component/PasswordTooltip'
import { FieldError } from 'component/Form'
import { usePageTitle } from 'hook'
import { PageHeader } from 'component/PageHeader'
import { AccountPageLayout } from 'appAccount/component/Layout'

import { UserProfilePasswordFormData } from '../model'
import { useUserProfilePassword, useUserProfileSchemas } from '../hook'

export const PageProfilePassword: React.FC = () => {
  usePageTitle('Change Password', { suffix: 'Veysur' })
  const navigate = useNavigate()
  const { showFlashMessage } = useFlashMessage()

  const { schemaUserProfilePassword } = useUserProfileSchemas()
  const { updatePassword, isLoading, error } = useUserProfilePassword()

  const form = useForm<UserProfilePasswordFormData>({
    resolver: datacapyResolver(schemaUserProfilePassword),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const result = await form.trigger()
    if (!result) return

    const values = form.getValues()

    try {
      await updatePassword(values)
      showFlashMessage('success', 'Password updated successfully')
      navigate('/profile')
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <AccountPageLayout fluid>
      <PageHeader title="Change Password" backUrl="/profile" />
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit}>
              <div className="space-y-4">
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
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">
                    New Password
                    <PasswordTooltip />
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...form.register('newPassword')}
                  />
                  {form.formState.errors.newPassword && (
                    <FieldError>
                      {form.formState.errors.newPassword.message}
                    </FieldError>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="do-not-autofill"
                    data-lpignore="true"
                    data-form-type="other"
                    {...form.register('confirmPassword')}
                  />
                  {form.formState.errors.confirmPassword && (
                    <FieldError>
                      {form.formState.errors.confirmPassword.message}
                    </FieldError>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Spinner size="sm" className="mr-2" />}
                    Change Password
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

export default PageProfilePassword
