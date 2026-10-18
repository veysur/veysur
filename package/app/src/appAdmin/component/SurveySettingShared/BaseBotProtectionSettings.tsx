import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'

import { BotProtectionKeysSetting } from 'veysur-common'

import { DefaultableSelectInput } from './DefaultableSelectInput'
import { OverridableTextField } from './OverridableTextField'
import { SettingNote } from './SettingNote'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers
}

const PROVIDERS = [
  { value: 'none', label: 'Off' },
  { value: 'simple', label: 'VeySur Bot Detection (no third party)' },
  { value: 'cloudflare', label: 'Cloudflare Turnstile' },
  { value: 'google', label: 'Google reCAPTCHA v3' },
]

const PROVIDER_HINTS: Record<string, string> = {
  simple: 'Runs in the browser. Nothing is sent to a third party.',
  cloudflare: 'Needs keys from Cloudflare.',
  google: 'Needs keys from Google.',
}

export function BaseBotProtectionSettings<T>({ data, handlers }: Props<T>) {
  const hasDefaults = !!data.getDefault
  const defaultProvider =
    data.getDefault?.<string | null | undefined>('botProtection', 'provider') ||
    'none'
  const provider =
    data.botProtection?.provider || (hasDefaults ? defaultProvider : 'none')

  const change = (field: string) => (value: string | null) =>
    handlers.handleStringChange?.('botProtection', field, value)

  const keyFields = (name: 'cloudflare' | 'google') => {
    const keys = data.botProtection?.[name]
    const defaultKeys =
      data.getDefault?.<BotProtectionKeysSetting | null | undefined>(
        'botProtection',
        name,
      ) ?? undefined

    return (
      <CardContent className="space-y-3 max-w-sm">
        <OverridableTextField
          label="Site key"
          htmlFor={`bot-${name}-site`}
          hasDefaults={hasDefaults}
          currentValue={keys?.siteKey}
          defaultValue={defaultKeys?.siteKey ?? ''}
          onChange={change(`${name}.siteKey`)}
        >
          {({ value, onChange, isUsingDefault }) => (
            <Input
              id={`bot-${name}-site`}
              autoComplete="off"
              spellCheck={false}
              disabled={isUsingDefault}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </OverridableTextField>
        <OverridableTextField
          label="Secret key"
          htmlFor={`bot-${name}-secret`}
          hasDefaults={hasDefaults}
          currentValue={keys?.secretKey}
          defaultValue=""
          onChange={change(`${name}.secretKey`)}
        >
          {({ value, onChange, isUsingDefault }) => (
            <>
              <Input
                id={`bot-${name}-secret`}
                type="password"
                autoComplete="off"
                spellCheck={false}
                disabled={isUsingDefault}
                placeholder={
                  (isUsingDefault ? defaultKeys?.hasSecret : keys?.hasSecret)
                    ? 'Saved'
                    : 'Not set'
                }
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Write-only. Leave blank to keep the saved key.
              </p>
            </>
          )}
        </OverridableTextField>
      </CardContent>
    )
  }

  return (
    <Card className="mb-4 max-w-2xl">
      <CardHeader>
        <CardTitle>Bot protection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-w-sm">
        {hasDefaults ? (
          <DefaultableSelectInput
            label="Provider"
            value={data.botProtection?.provider}
            onChange={change('provider')}
            options={PROVIDERS}
            hasDefaults
            defaultValue={defaultProvider}
          />
        ) : (
          <>
            <Label htmlFor="bot-provider">Provider</Label>
            <select
              id="bot-provider"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={provider}
              onChange={(e) => change('provider')(e.target.value)}
            >
              {PROVIDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        )}
        <p className="text-sm text-muted-foreground">
          Off by default. Once a provider is chosen, switch on Bot check in a
          survey&apos;s access settings, or in the default settings to cover every
          survey.
        </p>
        {PROVIDER_HINTS[provider] && (
          <p className="text-sm text-muted-foreground">
            {PROVIDER_HINTS[provider]}
          </p>
        )}
        {(provider === 'cloudflare' || provider === 'google') && (
          <SettingNote>
            Cloudflare and Google receive participant browser data when the
            check runs. Mention this in your privacy information and get consent
            where the law requires it.
          </SettingNote>
        )}
      </CardContent>
      {(provider === 'cloudflare' || provider === 'google') &&
        keyFields(provider)}
    </Card>
  )
}
