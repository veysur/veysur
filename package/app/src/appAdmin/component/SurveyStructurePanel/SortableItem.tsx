import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from 'common/cn'

export interface SortableItemProps {
  id: string
  data?: Record<string, unknown>
  isDragOverlay?: boolean
  children: React.ReactNode
}

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  data,
  isDragOverlay = false,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // The dragged item's own node sits at the slot it would drop into, so it doubles as
  // the placeholder: content hidden (it keeps its height), shown as a dashed outline.
  const isPlaceholder = isDragging && !isDragOverlay

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isPlaceholder &&
          'rounded-sm border-2 border-dashed border-primary bg-primary/10 [&>*]:invisible',
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}
