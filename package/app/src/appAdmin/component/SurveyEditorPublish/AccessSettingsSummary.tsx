import React from 'react'
import { Survey } from 'veysur-common'
import { SettingsDataAdapter } from 'appAdmin/component/SurveySettingShared'

type Props = {
  data: SettingsDataAdapter<Survey>
}

const SETTINGS = [
  { label: 'Anonymous', key: 'anonymous' },
  { label: 'Open', key: 'open' },
  { label: 'Registration', key: 'publicReg' },
]

export const AccessSettingsSummary: React.FC<Props> = ({ data }) => {
  const enabled = SETTINGS.filter(
    (s) => data.getValue && data.getValue('access', s.key) === true,
  ).map((s) => s.label)

  return (
    <span className="text-sm text-muted-foreground">
      {enabled.length > 0 ? enabled.join(' • ') : 'Restricted'}
    </span>
  )
}
