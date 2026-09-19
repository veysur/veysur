import React from 'react'
import { BarChart3, AlertCircle } from 'lucide-react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { GoldenEmptyState } from 'component/GoldenEmptyState'

interface Props {
  hasResponses: boolean
}

export const SurveyStatEmptyState: React.FC<Props> = ({ hasResponses }) => {
  if (!hasResponses) {
    return (
      <GoldenEmptyState
        icon={BarChart3}
        title="No responses yet"
        message="Statistics will appear once responses are submitted."
      />
    )
  }

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        No multiple choice questions found in this survey. Statistics are
        currently only available for multiple choice questions.
      </AlertDescription>
    </Alert>
  )
}
