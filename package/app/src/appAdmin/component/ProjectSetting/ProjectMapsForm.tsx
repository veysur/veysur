import React, { useState } from 'react'

import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'

type Props = {
  googleApiKey: string
  onSubmit: (googleApiKey: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const ProjectMapsForm: React.FC<Props> = ({
  googleApiKey,
  onSubmit,
  isLoading,
  error,
}) => {
  const [key, setKey] = useState(googleApiKey)
  const unchanged = key.trim() === googleApiKey

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(key)
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Google Maps</CardTitle>
          <CardDescription>
            Map questions use OpenStreetMap unless a Google Maps key is set. A
            key set here replaces the one configured for the whole installation.
            Participants receive this key in their browser, so restrict it to
            your survey websites in the Google Cloud console. You are
            responsible for obtaining participant consent where a map provider
            requires it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 max-w-sm">
          <Label htmlFor="google-maps-key">Google Maps API key</Label>
          <Input
            id="google-maps-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="Not set"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading || unchanged}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export default ProjectMapsForm
