import React, { useState } from 'react'
import { isMapAnswer } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { MapPinView } from 'component/SurveyQuestionType/map/MapPinView'

import { formatMapAnswer } from './formatAnswer'

interface MapAnswerSummaryProps {
  answerValue: unknown
  isPrint?: boolean
}

export const MapAnswerSummary: React.FC<MapAnswerSummaryProps> = ({
  answerValue,
  isPrint = false,
}) => {
  const [showMap, setShowMap] = useState(false)

  if (!isMapAnswer(answerValue)) {
    return <span className="text-base text-muted-foreground">—</span>
  }

  return (
    <div className="grid gap-2">
      <div className="text-base text-muted-foreground">
        {formatMapAnswer(answerValue)}
      </div>
      {!isPrint &&
        (showMap ? (
          <MapPinView lat={answerValue.lat} lng={answerValue.lng} />
        ) : (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMap(true)}
            >
              Show map
            </Button>
          </div>
        ))}
    </div>
  )
}
