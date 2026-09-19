import { Link } from 'react-router-dom'

import { Button } from 'component/shadcn/button'
import { Badge } from 'component/shadcn/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from 'component/shadcn/card'
import { useAuth, usePageTitle } from 'hook'
import { PageHeader } from 'component/PageHeader'
import { AccountPageLayout } from 'appAccount/component/Layout'
import { getProfileDangerZoneExtra } from 'registry'

const ProfileDangerZoneExtra = getProfileDangerZoneExtra()

export const PageProfile: React.FC = () => {
  usePageTitle('Profile Settings', { suffix: 'Veysur' })
  const { auth } = useAuth()

  const isEmailVerified =
    auth?.user?.emailMeta?.verify?.status?.isVerified === true
  const isTwoFactorEnabled = auth?.user?.twoFactorMeta?.enabled === true

  return (
    <AccountPageLayout fluid>
      <PageHeader title="Profile Settings" backUrl="/" />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your name information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {auth?.user?.nameFirst} {auth?.user?.nameLast}
              </span>
              <Button variant="outline" asChild>
                <Link to="/profile/basic">Edit</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Address Card */}
        <Card>
          <CardHeader>
            <CardTitle>Email Address</CardTitle>
            <CardDescription>Manage your email address</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm">{auth?.user?.email}</span>
                <Badge variant={isEmailVerified ? 'default' : 'secondary'}>
                  {isEmailVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
              <Button variant="outline" asChild>
                <Link to="/profile/email">Change Email</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <Button variant="outline" asChild>
                <Link to="/profile/password">Change Password</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Two-factor authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm">Two-Factor Authentication</span>
                <Badge variant={isTwoFactorEnabled ? 'default' : 'secondary'}>
                  {isTwoFactorEnabled ? 'Enabled' : 'Not enabled'}
                </Badge>
              </div>
              <Button variant="outline" asChild>
                <Link to="/profile/security">Manage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <ProfileDangerZoneExtra />
      </div>
    </AccountPageLayout>
  )
}

export default PageProfile
