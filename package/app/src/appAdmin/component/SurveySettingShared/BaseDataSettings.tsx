import { Card, CardHeader, CardTitle, CardContent } from 'component/shadcn/card'

import { DefaultableButtonSwitch } from './DefaultableButtonSwitch'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers & { YES: string; NO: string }
}

export function BaseDataSettings<T>({ data, handlers }: Props<T>) {
  const hasDefaults = !!data.getDefault

  return (
    <form>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Response Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <DefaultableButtonSwitch
              label="Timestamp"
              value={data.data?.timestamp}
              onChange={(value) =>
                handlers.handleBooleanChange?.('data', 'timestamp', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('data', 'timestamp')}
              helpText="Track data submit time for responses."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Referrer URL"
              value={data.data?.referrerUrl}
              onChange={(value) =>
                handlers.handleBooleanChange?.('data', 'referrerUrl', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('data', 'referrerUrl')}
              helpText="Track source URL from which participant accessed the survey."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="IP Address"
              value={data.data?.ip}
              onChange={(value) =>
                handlers.handleBooleanChange?.('data', 'ip', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('data', 'ip')}
              helpText="Record participant's IP address for responses."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Anonymise IP Address"
              value={data.data?.anonymiseIp}
              onChange={(value) =>
                handlers.handleBooleanChange?.('data', 'anonymiseIp', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('data', 'anonymiseIp')}
              helpText="Store IP addresses with the last part removed so individual participants cannot be identified."
              disabled={!data.data?.ip}
              className="mb-0"
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
