import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { Input } from 'component/shadcn/input'

import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'
import { OverridableTextField } from './OverridableTextField'
import { SettingNote } from './SettingNote'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers
}

export function BaseMapsSettings<T>({ data, handlers }: Props<T>) {
  const hasDefaults = !!data.getDefault
  const defaultKey =
    data.getDefault?.<string | null | undefined>('maps', 'googleApiKey') ?? ''

  const hasKey = !!(data.maps?.googleApiKey || (hasDefaults && defaultKey))

  return (
    <Card className="mb-4 max-w-2xl">
      <CardHeader>
        <CardTitle>Google Maps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-w-sm">
        <OverridableTextField
          label="Google Maps API key"
          htmlFor="google-maps-key"
          hasDefaults={hasDefaults}
          currentValue={data.maps?.googleApiKey}
          defaultValue={defaultKey}
          onChange={(value) =>
            handlers.handleStringChange?.('maps', 'googleApiKey', value)
          }
        >
          {({ value, onChange, isUsingDefault }) => (
            <Input
              id="google-maps-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              disabled={isUsingDefault}
              placeholder={
                isUsingDefault && defaultKey ? 'Project key saved' : 'Not set'
              }
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </OverridableTextField>
        <p className="text-sm text-muted-foreground">
          Without a key, map questions use OpenStreetMap.
          {!hasDefaults &&
            ' Replaces the key configured for the whole installation.'}
        </p>
        {hasKey && (
          <>
            <p className="text-sm text-muted-foreground">
              Participants receive this key in their browser. Restrict it to
              your survey websites in the Google Cloud console.
            </p>
            <SettingNote>
              Google Maps receives participant browser data. Get consent where
              the law requires it.
            </SettingNote>
          </>
        )}
      </CardContent>
    </Card>
  )
}
