import React, { useState } from 'react'

import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { PlanGateAlert } from 'component/PlanGateAlert'
import { useFeatureGate } from 'appAdmin/hook'

import { TeamInviteData } from './model'

type Props = {
  onSubmit: (data: TeamInviteData) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const TeamInviteForm: React.FC<Props> = ({
  onSubmit,
  isLoading,
  error,
}) => {
  const [nameFirst, setNameFirst] = useState('')
  const [nameLast, setNameLast] = useState('')
  const [email, setEmail] = useState('')
  const { isAtLimit } = useFeatureGate()
  const atMemberLimit = isAtLimit('USERS')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ nameFirst, nameLast: nameLast || undefined, email })
    setNameFirst('')
    setNameLast('')
    setEmail('')
  }

  return (
    <form onSubmit={handleSubmit}>
      {atMemberLimit && (
        <PlanGateAlert
          message="You've reached the team member limit for your plan."
          className="mb-3 max-w-lg mx-auto"
        />
      )}
      {error && (
        <Alert variant="destructive" className="mb-3 max-w-lg mx-auto">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Invite a Team Member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nameFirst">First Name</Label>
              <Input
                id="nameFirst"
                value={nameFirst}
                onChange={(e) => setNameFirst(e.target.value)}
                required
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameLast">Last Name</Label>
              <Input
                id="nameLast"
                value={nameLast}
                onChange={(e) => setNameLast(e.target.value)}
                placeholder="Last name (optional)"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading || atMemberLimit}>
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
