import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRight, ArrowUp, ArrowDown, GripVertical, X } from 'lucide-react'
import { SurveyAnswerOption } from 'veysur-common'

import { Button } from 'component/shadcn/button'

type AvailableItemProps = {
  option: SurveyAnswerOption
  label: string
  onAdd: () => void
}

export const AvailableItem: React.FC<AvailableItemProps> = ({
  label,
  onAdd,
}) => (
  <div className="flex items-center gap-2 rounded-md border border-input bg-background shadow-xs px-3 py-2 text-sm">
    <span className="flex-1">{label}</span>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={onAdd}
      title="Add to ranking"
    >
      <ArrowRight className="h-3 w-3" />
    </Button>
  </div>
)

type RankedItemProps = {
  id: string
  rank: number
  label: string
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export const RankedItem: React.FC<RankedItemProps> = ({
  id,
  rank,
  label,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-input bg-muted/40 shadow-xs px-3 py-2 text-sm"
    >
      <span
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="w-5 shrink-0 text-right font-medium text-muted-foreground">
        {rank}.
      </span>
      <span className="flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
        <div className="h-4 w-px bg-border mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          title="Remove from ranking"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
