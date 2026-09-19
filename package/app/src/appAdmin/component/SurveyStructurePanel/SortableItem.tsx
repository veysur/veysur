import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface SortableItemProps {
  id: string
  data?: Record<string, unknown>
  children: React.ReactNode
}

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  data,
  children,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, data })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}
