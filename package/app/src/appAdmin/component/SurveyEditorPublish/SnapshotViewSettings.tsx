import React from 'react'
import { SurveySnapshotPartial } from 'veysur-common'

import { formatDateTimeLong } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

type Props = {
  snapshot: SurveySnapshotPartial | null
}

export const SnapshotViewSettings: React.FC<Props> = ({ snapshot }) => {
  const tz = useDisplayTimezone()
  const surveyPartial = snapshot?.surveyPartial

  return (
    <div>
      <h4 className="font-semibold text-sm mb-3">Schedule</h4>
      <div className="mb-3">
        <strong>Published:</strong>
        <div className="text-muted-foreground">
          {snapshot?.createdAt
            ? formatDateTimeLong(snapshot.createdAt, tz)
            : 'Unknown'}
        </div>
      </div>
      <div className="mb-3">
        <strong>Start Time:</strong>
        <div className="text-muted-foreground">
          {surveyPartial?.schedule?.start
            ? formatDateTimeLong(surveyPartial.schedule.start, tz)
            : 'Immediately'}
        </div>
      </div>
      <div className="mb-0">
        <strong>End Time:</strong>
        <div className="text-muted-foreground">
          {surveyPartial?.schedule?.end
            ? formatDateTimeLong(surveyPartial.schedule.end, tz)
            : 'Until stopped'}
        </div>
      </div>
    </div>
  )
}
