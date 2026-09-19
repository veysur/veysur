import React from 'react'
import { Star } from 'lucide-react'
import { QUESTION_TYPE_STAR_RATING } from 'veysur-common'

interface MultiPartPointScaleCellPreviewProps {
  partType: string
  pointNumber: number
  pointCount: number
}

/**
 * A single, static (unselected/disabled) point button — one per grid cell,
 * so each cell's width matches its column header exactly, the same way
 * `MatrixCellPreview` gives Matrix one real cell-typed control per `<td>`.
 * `MultipleChoiceStarRating`/`MultipleChoicePointScale` render all N points
 * as one flex row instead, which can't be split across per-column `<td>`s
 * without breaking header alignment, so this mirrors their unselected-state
 * styling directly rather than reusing them.
 */
export const MultiPartPointScaleCellPreview: React.FC<
  MultiPartPointScaleCellPreviewProps
> = ({ partType, pointNumber, pointCount }) => {
  if (partType === QUESTION_TYPE_STAR_RATING) {
    return (
      <div className="pointer-events-none flex justify-center">
        <Star className="h-8 w-8 fill-transparent text-muted-foreground/40" />
      </div>
    )
  }

  const buttonSizeClass = pointCount >= 10 ? 'h-8 w-8 text-sm' : 'h-10 w-10'

  return (
    <div className="pointer-events-none flex justify-center">
      <div
        className={`${buttonSizeClass} flex items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-background font-semibold text-muted-foreground`}
      >
        {pointNumber}
      </div>
    </div>
  )
}
