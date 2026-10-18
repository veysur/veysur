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
import type { BotProtectionInput } from 'appAdmin/api/SettingProjectApi'

type StoredKeys = { siteKey?: string; secretKey?: string; hasSecret?: boolean }

type Props = {
  stored?: {
    provider?: string
    cloudflare?: StoredKeys
    google?: StoredKeys
  }
  onSubmit: (input: BotProtectionInput) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

const PROVIDERS = [
  { value: 'none', label: 'Off' },
  { value: 'simple', label: 'VeySur Bot Detection (no third party)' },
  { value: 'cloudflare', label: 'Cloudflare Turnstile' },
  { value: 'google', label: 'Google reCAPTCHA v3' },
]

export const ProjectBotProtectionForm: React.FC<Props> = ({
  stored,
  onSubmit,
  isLoading,
  error,
}) => {
  const [provider, setProvider] = useState(stored?.provider || 'none')
  const [siteKeys, setSiteKeys] = useState({
    cloudflare: stored?.cloudflare?.siteKey ?? '',
    google: stored?.google?.siteKey ?? '',
  })
  const [secretKeys, setSecretKeys] = useState({ cloudflare: '', google: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      provider,
      cloudflare: {
        siteKey: siteKeys.cloudflare,
        secretKey: secretKeys.cloudflare,
      },
      google: { siteKey: siteKeys.google, secretKey: secretKeys.google },
    })
  }

  const keyFields = (name: 'cloudflare' | 'google') => (
    <CardContent className="space-y-3 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor={`bot-${name}-site`}>Site key</Label>
        <Input
          id={`bot-${name}-site`}
          autoComplete="off"
          spellCheck={false}
          value={siteKeys[name]}
          onChange={(e) =>
            setSiteKeys((keys) => ({ ...keys, [name]: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`bot-${name}-secret`}>Secret key</Label>
        <Input
          id={`bot-${name}-secret`}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={stored?.[name]?.hasSecret ? 'Saved' : 'Not set'}
          value={secretKeys[name]}
          onChange={(e) =>
            setSecretKeys((keys) => ({ ...keys, [name]: e.target.value }))
          }
        />
        <p className="text-sm text-muted-foreground">
          Write-only. Leave blank to keep the saved key.
        </p>
      </div>
    </CardContent>
  )

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Bot protection</CardTitle>
          <CardDescription>
            Off by default. Choose a provider here, then switch on the bot check
            for the whole project or for individual surveys in their access
            settings. Cloudflare and Google receive participant browser data
            when their check runs. You are responsible for disclosing this in
            your privacy information and obtaining consent where the law
            requires it. VeySur Bot Detection sends nothing to a third party.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 max-w-sm">
          <Label htmlFor="bot-provider">Provider</Label>
          <select
            id="bot-provider"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </CardContent>
        {(provider === 'cloudflare' || provider === 'google') &&
          keyFields(provider)}
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export default ProjectBotProtectionForm
