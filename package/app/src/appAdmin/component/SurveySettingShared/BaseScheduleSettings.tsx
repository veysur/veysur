import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { ButtonSwitch } from 'component/ButtonSwitch'
import { Button } from 'component/shadcn/button'
import { Label } from 'component/shadcn/label'

import { DefaultableValueDatetime } from './DefaultableValueDatetime'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers
  layout?: {
    wrapInForm?: boolean
    wrapInRow?: boolean
    cardClassName?: string
    showCard?: boolean
  }
}

export function BaseScheduleSettings<T>({ data, handlers, layout }: Props<T>) {
  const {
    wrapInForm = true,
    wrapInRow = true,
    cardClassName = 'mb-4',
    showCard = true,
  } = layout || {}

  // Determine start date mode: null/undefined = 'immediate', any value = 'specific'
  const startDateMode =
    data.schedule?.start === null || data.schedule?.start === undefined
      ? 'immediate'
      : 'specific'

  // Determine end date mode: null/undefined = 'until-stopped', any value = 'specific'
  const endDateMode =
    data.schedule?.end === null || data.schedule?.end === undefined
      ? 'until-stopped'
      : 'specific'

  const scheduleContent = (
    <>
      <div className="mb-3">
        <Label className="mb-2 block">Start</Label>
        <ButtonSwitch
          value={startDateMode}
          onChange={(mode) => {
            if (['immediate', 'specific'].includes(mode)) {
              handlers.handleStringChange?.(
                'schedule',
                'start',
                mode === 'specific' ? '' : null,
              )
            }
          }}
          className="mb-3"
        >
          <Button value="immediate">Immediately</Button>
          <Button value="specific">Specific Time</Button>
        </ButtonSwitch>

        {startDateMode === 'specific' && (
          <DefaultableValueDatetime
            label=""
            currentValue={data.schedule?.start}
            onChange={(value) => {
              value = value == '' ? null : value
              handlers.handleStringChange?.('schedule', 'start', value)
            }}
            helpText="Survey will be available from this date and time."
            className="mt-3"
          />
        )}
      </div>

      <div className="mb-0">
        <Label className="mb-2 block">End</Label>
        <ButtonSwitch
          value={endDateMode}
          onChange={(mode) => {
            if (['until-stopped', 'specific'].includes(mode)) {
              handlers.handleStringChange?.(
                'schedule',
                'end',
                mode === 'specific' ? '' : null,
              )
            }
          }}
          className="mb-3"
        >
          <Button value="until-stopped">Until Stopped</Button>
          <Button value="specific">Specific Time</Button>
        </ButtonSwitch>

        {endDateMode === 'specific' && (
          <DefaultableValueDatetime
            label=""
            currentValue={data.schedule?.end}
            onChange={(value) => {
              value = value == '' ? null : value
              handlers.handleStringChange?.('schedule', 'end', value)
            }}
            helpText="Survey will stop accepting responses after this date and time."
            className="mt-3"
          />
        )}
      </div>
    </>
  )

  const cardContent = showCard ? (
    <Card className={cardClassName}>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
      </CardHeader>
      <CardContent>{scheduleContent}</CardContent>
    </Card>
  ) : (
    <div>{scheduleContent}</div>
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
