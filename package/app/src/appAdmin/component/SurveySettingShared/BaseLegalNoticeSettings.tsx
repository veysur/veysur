import { L10n } from 'veysur-common'

import { Card, CardHeader, CardTitle, CardContent } from 'component/shadcn/card'
import { LanguageSelector } from 'component/LanguageSelector'

import { DefaultableValueContentEditor } from './DefaultableValueContentEditor'
import { DefaultableValueInput } from './DefaultableValueInput'
import { DefaultableButtonSwitch } from './DefaultableButtonSwitch'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'
import { useLanguageSelector } from './hook/useLanguageSelector'
import { useEffectiveContentFormat } from './hook'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers
  YES: string
  NO: string
}

export function BaseLegalNoticeSettings<T>({
  data,
  handlers,
  YES,
  NO,
}: Props<T>) {
  const hasDefaults = !!data.getDefault
  const {
    selectedLanguage,
    setSelectedLanguage,
    availableLanguages,
    langEditing,
    getText,
  } = useLanguageSelector(data)
  const contentFormat = useEffectiveContentFormat(data)

  return (
    <form>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="mb-4 lg:col-span-1 h-full">
          <CardHeader className="border-b">
            <CardTitle>Display Options</CardTitle>
          </CardHeader>
          <CardContent>
            <DefaultableButtonSwitch
              label="Show"
              value={data.legalNotice?.show}
              onChange={(value) =>
                handlers.handleBooleanChange?.('legalNotice', 'show', value)
              }
              options={[
                { value: YES, label: YES },
                { value: NO, label: NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('legalNotice', 'show')}
              helpText="Display legal notice information to participants."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Link"
              value={data.legalNotice?.link}
              onChange={(value) =>
                handlers.handleBooleanChange?.('legalNotice', 'link', value)
              }
              options={[
                { value: YES, label: YES },
                { value: NO, label: NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('legalNotice', 'link')}
              helpText="Show legal notice as a clickable link rather than inline text."
              className="mb-0"
            />
          </CardContent>
        </Card>
        <Card className="mb-4 lg:col-span-1 h-full">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center relative">
              <CardTitle>Content</CardTitle>
              <div className="absolute right-0">
                <LanguageSelector
                  availableLanguages={availableLanguages.map(
                    (lang) => lang.value,
                  )}
                  langEditing={selectedLanguage}
                  onLanguageChange={setSelectedLanguage}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DefaultableValueContentEditor
              label="Text"
              currentValue={getText(data.legalNotice?.text, langEditing)}
              defaultValue={
                getText(
                  data.getDefault?.<L10n | null>('legalNotice', 'text'),
                  langEditing,
                ) ?? ''
              }
              onChange={(value) =>
                handlers.handleL10nChange?.(
                  'legalNotice',
                  'text',
                  value,
                  langEditing,
                )
              }
              hasDefaults={hasDefaults}
              placeholder="Legal notice text"
              withToolbar={true}
              format={contentFormat}
              className={data.legalNotice?.link ? 'mb-3' : 'mb-0'}
            />

            {data.legalNotice?.link && (
              <DefaultableValueInput
                label="URL"
                type="url"
                currentValue={getText(data.legalNotice?.url, langEditing)}
                defaultValue={
                  getText(
                    data.getDefault?.<L10n | null>('legalNotice', 'url'),
                    langEditing,
                  ) || ''
                }
                section="legalNotice"
                field="url"
                handler={(section, field, value) =>
                  handlers.handleL10nChange?.(section, field, value, langEditing)
                }
                hasDefaults={hasDefaults}
                placeholder="https://example.com/legal-notice"
                helpText="URL the clickable link opens for this language."
                className="mb-0"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
