import { Card, CardHeader, CardContent } from 'component/shadcn/card'

import { DefaultableValueInput } from './DefaultableValueInput'
import { DefaultableButtonSwitch } from './DefaultableButtonSwitch'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers & { YES: string; NO: string }
}

export function BaseParticipantSettings<T>({ data, handlers }: Props<T>) {
  const hasDefaults = !!data.getDefault

  return (
    <form>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="mb-4 h-full">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <span>📧</span>
              <span className="mb-0 font-semibold">Emails</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* HTML Email: hidden until HTML email sending is implemented — see docs/pending-features.md */}

            <DefaultableButtonSwitch
              label="Thank You Email"
              value={data.participant?.thankYouEmail}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'participant',
                  'thankYouEmail',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('participant', 'thankYouEmail')}
              helpText="Send thank you email after completion of survey."
              className="mb-0"
            />
          </CardContent>
        </Card>

        <Card className="mb-4 h-full">
          <CardHeader className="bg-info/10 border-b border-info/25">
            <div className="flex items-center gap-2">
              <span>🔑</span>
              <span className="mb-0 font-semibold">Token Settings</span>
            </div>
          </CardHeader>
          <CardContent>
            <DefaultableValueInput
              label="Token Length"
              currentValue={data.participant?.tokenLength}
              defaultValue={
                data.getDefault?.('participant', 'tokenLength') || 16
              }
              section="participant"
              field="tokenLength"
              handler={handlers.handleNumberChange!}
              hasDefaults={hasDefaults}
              type="number"
              min={4}
              max={64}
              helpText="Length of participant access tokens"
              placeholder="Enter token length"
              className="mb-0"
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
