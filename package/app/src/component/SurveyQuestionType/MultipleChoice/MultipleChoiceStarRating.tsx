import React from 'react'
import { Star } from 'lucide-react'

import { QUESTION_TYPE_STAR_RATING } from 'veysur-common'

import { QuestionTypeProps } from '../QuestionTypeProps'
import { useRatingSelection } from './useRatingSelection'
import { getRatingPointLabel, POINT_SCALE_LAYOUT } from './ratingScaleLabels'

const STAR_COUNT = 5

export interface MultipleChoiceStarRatingProps extends QuestionTypeProps {
  hideLabels?: boolean
}

export const MultipleChoiceStarRating: React.FC<
  MultipleChoiceStarRatingProps
> = ({ value, onChange, question, lang, langDefault, hideLabels }) => {
  const {
    selectedValue,
    displayValue,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
    handleKeyDown,
  } = useRatingSelection(value, STAR_COUNT, onChange)

  const { columnWidth } = POINT_SCALE_LAYOUT[QUESTION_TYPE_STAR_RATING]

  return (
    <div
      className="flex items-end gap-1"
      role="radiogroup"
      aria-label="Star rating"
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const starNumber = index + 1
        const isFilled = displayValue !== null && starNumber <= displayValue
        const isSelected = selectedValue !== null && starNumber <= selectedValue
        const starLabel = getRatingPointLabel(
          question,
          index,
          lang,
          langDefault,
        )

        return (
          <div
            key={starNumber}
            className="flex min-w-0 flex-col items-center gap-1"
            style={{ width: columnWidth }}
          >
            {!hideLabels && starLabel && (
              <span className="text-muted-foreground w-full text-center text-xs leading-tight break-normal">
                {starLabel}
              </span>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={
                starLabel || `${starNumber} star${starNumber === 1 ? '' : 's'}`
              }
              tabIndex={0}
              className="p-1 rounded transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-110 active:scale-95"
              onClick={() => handleClick(starNumber)}
              onMouseEnter={() => handleMouseEnter(starNumber)}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, starNumber)}
            >
              <Star
                className={`w-8 h-8 transition-colors duration-150 ${
                  isFilled
                    ? 'fill-primary text-primary'
                    : 'fill-transparent text-muted-foreground/40'
                }`}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
