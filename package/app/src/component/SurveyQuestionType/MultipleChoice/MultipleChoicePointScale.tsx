import React from 'react'

import { QUESTION_TYPE_POINT_5, QUESTION_TYPE_POINT_10 } from 'veysur-common'

import { QuestionTypeProps } from '../QuestionTypeProps'
import { useRatingSelection } from './useRatingSelection'
import {
  getRatingPointLabel,
  POINT_SCALE_LAYOUT,
  pointColumnStyle,
} from './ratingScaleLabels'

export interface MultipleChoicePointScaleProps extends QuestionTypeProps {
  pointCount: number
  hideLabels?: boolean
}

export const MultipleChoicePointScale: React.FC<
  MultipleChoicePointScaleProps
> = ({
  value,
  onChange,
  pointCount,
  question,
  lang,
  langDefault,
  hideLabels,
}) => {
  const {
    selectedValue,
    displayValue,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
    handleKeyDown,
  } = useRatingSelection(value, pointCount, onChange)

  // Buttons fill their shrinkable column; smaller text for 10+ points
  const buttonSizeClass =
    pointCount >= 10 ? 'w-full aspect-square text-sm' : 'w-full aspect-square'
  const { columnWidth, gapClassName } =
    POINT_SCALE_LAYOUT[
      pointCount >= 10 ? QUESTION_TYPE_POINT_10 : QUESTION_TYPE_POINT_5
    ]

  return (
    <div
      className={`flex flex-nowrap items-end ${gapClassName}`}
      role="radiogroup"
      aria-label={`${pointCount} point rating`}
    >
      {Array.from({ length: pointCount }, (_, index) => {
        const pointNumber = index + 1
        const isSelected = selectedValue === pointNumber
        const isHovered = displayValue === pointNumber
        const pointLabel = getRatingPointLabel(
          question,
          index,
          lang,
          langDefault,
        )

        return (
          <div
            key={pointNumber}
            className="flex min-w-0 flex-col items-center gap-1"
            style={pointColumnStyle(columnWidth)}
          >
            {!hideLabels && pointLabel && (
              <span className="text-muted-foreground text-center text-xs leading-tight break-normal line-clamp-2 overflow-hidden">
                {pointLabel}
              </span>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={
                pointLabel ||
                `${pointNumber} point${pointNumber === 1 ? '' : 's'}`
              }
              tabIndex={0}
              className={`${buttonSizeClass} rounded-full border-2 flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-110 active:scale-95 ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isHovered
                    ? 'bg-muted border-primary text-foreground'
                    : 'bg-background border-muted-foreground/30 text-muted-foreground'
              }`}
              onClick={() => handleClick(pointNumber)}
              onMouseEnter={() => handleMouseEnter(pointNumber)}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, pointNumber)}
            >
              {pointNumber}
            </button>
          </div>
        )
      })}
    </div>
  )
}
