import React from 'react'
import { SurveySnapshotPartial } from 'veysur-common'

type Props = {
  snapshot: SurveySnapshotPartial | null
}

export const SnapshotViewAccess: React.FC<Props> = ({ snapshot }) => {
  const surveyPartial = snapshot?.surveyPartial

  return (
    <div>
      <h4 className="font-semibold text-sm mb-3">Access Control</h4>
      <div className="mb-3">
        <strong>Anonymous:</strong>
        <div className="text-muted-foreground">
          {surveyPartial?.access?.anonymous ? 'Yes' : 'No'}
        </div>
      </div>
      <div className="mb-3">
        <strong>Open:</strong>
        <div className="text-muted-foreground">
          {surveyPartial?.access?.open ? 'Yes' : 'No'}
        </div>
      </div>
      <div className="mb-3">
        <strong>Public Registration:</strong>
        <div className="text-muted-foreground">
          {surveyPartial?.access?.publicReg ? 'Yes' : 'No'}
        </div>
      </div>
      <div className="mb-0">
        <strong>Index:</strong>
        <div className="text-muted-foreground">
          {surveyPartial?.access?.index ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
  )
}
