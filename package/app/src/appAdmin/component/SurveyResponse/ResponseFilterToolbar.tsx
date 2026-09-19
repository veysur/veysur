import React from 'react'
import { SurveyPublicationSelector } from 'appAdmin/component/SurveyEditor'

export interface ResponseFilterToolbarProps {
  surveyId?: string
  selectedPublicationId: string
  onPublicationChange: (publicationId: string) => void
  isFetching: boolean
}

export const ResponseFilterToolbar: React.FC<ResponseFilterToolbarProps> = ({
  surveyId,
  selectedPublicationId,
  onPublicationChange,
  isFetching,
}) => {
  return (
    <div className="flex items-center gap-3">
      <SurveyPublicationSelector
        surveyId={surveyId}
        selectedPublicationId={selectedPublicationId}
        onPublicationChange={onPublicationChange}
        isFetching={isFetching}
      />
    </div>
  )
}
