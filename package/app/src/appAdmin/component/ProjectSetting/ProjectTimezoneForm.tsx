import React, { useState } from 'react'
import momentTimezone from 'moment-timezone'

import { Button } from 'component/shadcn/button'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from 'component/shadcn/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'

const TIMEZONE_OPTIONS = momentTimezone.tz.names()

type Props = {
  timezone: string
  onSubmit: (timezone: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const ProjectTimezoneForm: React.FC<Props> = ({
  timezone,
  onSubmit,
  isLoading,
  error,
}) => {
  const [selectedTimezone, setSelectedTimezone] = useState(timezone)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(selectedTimezone)
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-3 max-w-lg mx-auto">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Project Timezone</CardTitle>
          <CardDescription>
            Determines the day boundaries for date filters like
            &ldquo;Today&rdquo;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select a timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading || selectedTimezone === timezone}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export default ProjectTimezoneForm
