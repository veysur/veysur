// cspell:ignore droppables
import { useLayoutEffect } from 'react'
import { useDndContext } from '@dnd-kit/core'

import type { DragArrangement } from './hook/useDragAndDrop'

// Droppables are measured once at drag start. A cross-group move changes the layout
// mid-drag, so re-measure once after each such change instead of continuously.
export const DragRemeasure: React.FC<{ arrangement: DragArrangement | null }> = ({
  arrangement,
}) => {
  const { droppableContainers, measureDroppableContainers } = useDndContext()

  useLayoutEffect(() => {
    if (!arrangement) return
    measureDroppableContainers(
      droppableContainers.getEnabled().map((container) => container.id),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangement])

  return null
}
