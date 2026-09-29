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
import { useAuth, usePageTitle } from 'hook'
import { PageHeader } from 'component/PageHeader'
import { AccountPageLayout } from 'appAccount/component/Layout'

import {
  SchemaUserProfileBasicInfo,
  UserProfileBasicInfoFormData,
} from '../model'
import { useUserProfileBasicInfo } from '../hook'

export const PageProfileBasic: React.FC = () => {
  usePageTitle('Basic Information', { suffix: 'Veysur' })
  const navigate = useNavigate()
  const { showFlashMessage } = useFlashMessage()
  const { auth } = useAuth()

  const { updateBasicInfo, isLoading, error } = useUserProfileBasicInfo()

  const form = useForm<UserProfileBasicInfoFormData>({
    resolver: datacapyResolver(SchemaUserProfileBasicInfo),
    defaultValues: {
      nameFirst: auth?.user?.nameFirst || '',
      nameLast: auth?.user?.nameLast || '',
    },
  })

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const result = await form.trigger()
    if (!result) return

    const values = form.getValues()

    try {
      await updateBasicInfo(values)
      showFlashMessage('success', 'Profile updated successfully')
      navigate('/profile')
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <AccountPageLayout fluid>
      <PageHeader title="Basic Information" backUrl="/profile" />
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-start">
                  <div className="grid gap-2">
                    <Label htmlFor="nameFirst">First Name</Label>
                    <Input
                      id="nameFirst"
                      type="text"
                      {...form.register('nameFirst')}
                    />
                    {form.formState.errors.nameFirst && (
                      <FieldError>
                        {form.formState.errors.nameFirst.message}
                      </FieldError>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nameLast">Last Name</Label>
                    <Input
                      id="nameLast"
                      type="text"
                      {...form.register('nameLast')}
                    />
                    {form.formState.errors.nameLast && (
                      <FieldError>
                        {form.formState.errors.nameLast.message}
                      </FieldError>
                    )}
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Spinner size="sm" className="mr-2" />}
                    Save Changes
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

export default PageProfileBasic
