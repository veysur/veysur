import React from 'react'

import { SurveyQuestion } from 'veysur-common'

import { getRatingPointLabel } from './ratingScaleLabels'

export interface RatingScaleLabelsHeaderProps {
  question: SurveyQuestion
  lang: string
  langDefault: string
  pointCount: number
  columnWidth: string
  gapClassName: string
}

export const RatingScaleLabelsHeader: React.FC<
  RatingScaleLabelsHeaderProps
> = ({
  question,
  lang,
  langDefault,
  pointCount,
  columnWidth,
  gapClassName,
}) => {
  const pointLabels = Array.from({ length: pointCount }, (_, index) =>
    getRatingPointLabel(question, index, lang, langDefault),
  )

  if (!pointLabels.some(Boolean)) {
    return null
  }

  return (
    <div
      className={`flex flex-wrap items-end ${gapClassName}`}
      aria-hidden="true"
      data-testid="rating-scale-labels-header"
    >
      {pointLabels.map((pointLabel, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-col items-center gap-1"
          style={{ width: columnWidth }}
        >
          <span className="text-muted-foreground w-full text-center text-xs leading-tight break-normal">
            {pointLabel}
          </span>
        </div>
      ))}
    </div>
  )
}
