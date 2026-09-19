import { Card, CardHeader, CardContent, CardTitle } from 'component/shadcn/card'

import { useFeatureGate } from 'appAdmin/hook'

import { DefaultableButtonSwitch } from './DefaultableButtonSwitch'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers & { YES: string; NO: string }
  layout?: {
    wrapInForm?: boolean
    wrapInRow?: boolean
    cardClassName?: string
    showCard?: boolean
  }
}

export function BaseAccessSettings<T>({ data, handlers, layout }: Props<T>) {
  const hasDefaults = !!data.getDefault
  const { canUse } = useFeatureGate()
  const canUseOpen = canUse('OPEN')

  const {
    wrapInForm = true,
    wrapInRow = true,
    cardClassName = 'mb-4',
    showCard = true,
  } = layout || {}

  const switches = (
    <>
      <DefaultableButtonSwitch
        label="Anonymous"
        value={data.access?.anonymous}
        onChange={(value) =>
          handlers.handleBooleanChange?.('access', 'anonymous', value)
        }
        options={[
          { value: handlers.YES, label: handlers.YES },
          { value: handlers.NO, label: handlers.NO },
        ]}
        hasDefaults={hasDefaults}
        defaultValue={data.getDefault?.('access', 'anonymous')}
        helpText="Participant-ID and response times are not recorded, making responses untraceable to participants."
        className="mb-3"
      />

      <DefaultableButtonSwitch
        label="Open"
        value={data.access?.open}
        onChange={(value) =>
          handlers.handleBooleanChange?.('access', 'open', value)
        }
        options={[
          { value: handlers.YES, label: handlers.YES },
          { value: handlers.NO, label: handlers.NO },
        ]}
        hasDefaults={hasDefaults}
        defaultValue={data.getDefault?.('access', 'open')}
        helpText={
          canUseOpen
            ? 'Survey can be accessed by anyone with the link.'
            : 'Upgrade your plan to allow public access to surveys.'
        }
        disabled={!canUseOpen}
        className="mb-3"
      />

      <DefaultableButtonSwitch
        label="Public Registration"
        value={data.access?.publicReg}
        onChange={(value) =>
          handlers.handleBooleanChange?.('access', 'publicReg', value)
        }
        options={[
          { value: handlers.YES, label: handlers.YES },
          { value: handlers.NO, label: handlers.NO },
        ]}
        hasDefaults={hasDefaults}
        defaultValue={data.getDefault?.('access', 'publicReg')}
        helpText="Allow registration for closed survey / require registration for open surveys."
        className="mb-0"
      />
    </>
  )

  const cardContent = showCard ? (
    <Card className={cardClassName}>
      <CardHeader>
        <CardTitle>Access Control</CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-y-auto">{switches}</CardContent>
    </Card>
  ) : (
    <div>{switches}</div>
  )

  const content = wrapInRow ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {cardContent}
    </div>
  ) : (
    cardContent
  )

  return wrapInForm ? <form>{content}</form> : content
}
