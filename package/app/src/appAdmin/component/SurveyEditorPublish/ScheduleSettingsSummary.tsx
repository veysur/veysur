import React from 'react'
import { SettingsDataAdapter } from 'appAdmin/component/SurveySettingShared'

import { formatDateTimeLong } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

type Props = {
  data: SettingsDataAdapter<unknown>
}

export const ScheduleSettingsSummary: React.FC<Props> = ({ data }) => {
  const tz = useDisplayTimezone()
  const formatDate = (value: Date | string | null | undefined): string =>
    value === null || value === undefined || value === ''
      ? ''
      : formatDateTimeLong(value, tz)

  const startMode =
    data.schedule?.start === null || data.schedule?.start === undefined
      ? 'Immediately'
      : formatDate(data.schedule.start)

  const endMode =
    data.schedule?.end === null || data.schedule?.end === undefined
      ? 'Until Stopped'
      : formatDate(data.schedule.end)

  return (
    <span className="text-sm text-muted-foreground">
      {startMode} → {endMode}
    </span>
  )
}
