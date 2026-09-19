import { useMemo } from 'react'
import {
  Iso639v1,
  getLanguageName,
  sortLanguageCodesByName,
} from 'veysur-common'

import { Card, CardHeader, CardContent } from 'component/shadcn/card'
import { FormInputSelectTags } from 'component/Form'

import { DefaultableSelectInput } from './DefaultableSelectInput'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers
}

export function BaseLanguageSettings<T>({ data, handlers }: Props<T>) {
  const languageOptions = useMemo(() => {
    return sortLanguageCodesByName(Object.keys(Iso639v1)).map((code) => ({
      value: code,
      label: `${getLanguageName(code)} (${code.toUpperCase()})`,
    }))
  }, [])

  const defaultValue = data.getDefault?.<string | boolean | undefined>(
    'language',
    'default',
  )

  const sortedLanguageOptions = sortLanguageCodesByName(
    data.language?.options || [],
  )

  return (
    <form>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="mb-4 h-full">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <span className="mb-0 font-semibold">Language Configuration</span>
            </div>
          </CardHeader>
          <CardContent>
            <FormInputSelectTags
              options={languageOptions}
              value={sortedLanguageOptions}
              onChange={handlers.handleLanguageOptionsChange || (() => {})}
              label="Language Options"
              placeholder="Select a language to add..."
            />
            <p className="text-sm text-muted-foreground mb-3">
              Available languages for survey content. At least one language must
              be selected.
            </p>
            <DefaultableSelectInput
              label="Default Language"
              value={data.language?.default}
              onChange={(value) =>
                handlers.handleStringChange?.('language', 'default', value)
              }
              options={sortedLanguageOptions.map((languageCode: string) => {
                const languageLabel = getLanguageName(languageCode)
                return {
                  value: languageCode,
                  label: languageLabel
                    ? `${languageLabel} (${languageCode.toUpperCase()})`
                    : languageCode,
                }
              })}
              hasDefaults={!!defaultValue}
              defaultValue={defaultValue}
              helpText="Primary language used when language-specific content is not available."
              disabled={sortedLanguageOptions.length === 0}
              className="mb-0"
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
