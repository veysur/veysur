import { useEffect } from 'react'

const EDGE_PX = 24
const MIN_DISTANCE_PX = 60
const DESKTOP_MIN_WIDTH_PX = 1024

export interface EdgeSwipeHandlers {
  onSwipeFromLeft?: () => void
  onSwipeFromRight?: () => void
}

/**
 * Calls a handler when a touch starts at a screen edge and travels inward.
 * Inactive from the lg breakpoint up, and while any dialog or drawer is open.
 */
export function useEdgeSwipe({
  onSwipeFromLeft,
  onSwipeFromRight,
}: EdgeSwipeHandlers) {
  useEffect(() => {
    let start: { x: number; y: number; side: 'left' | 'right' } | null = null

    const handleStart = (e: TouchEvent) => {
      start = null
      if (e.touches.length !== 1 || window.innerWidth >= DESKTOP_MIN_WIDTH_PX) {
        return
      }
      const { clientX, clientY } = e.touches[0]
      if (clientX <= EDGE_PX) {
        start = { x: clientX, y: clientY, side: 'left' }
      } else if (clientX >= window.innerWidth - EDGE_PX) {
        start = { x: clientX, y: clientY, side: 'right' }
      }
    }

    const handleEnd = (e: TouchEvent) => {
      if (!start || document.querySelector('[role="dialog"]')) return
      const { clientX, clientY } = e.changedTouches[0]
      const dx = clientX - start.x
      const dy = clientY - start.y
      const horizontal =
        Math.abs(dx) >= MIN_DISTANCE_PX && Math.abs(dy) < Math.abs(dx) / 2
      if (horizontal && start.side === 'left' && dx > 0) onSwipeFromLeft?.()
      if (horizontal && start.side === 'right' && dx < 0) onSwipeFromRight?.()
      start = null
    }

    document.addEventListener('touchstart', handleStart, { passive: true })
    document.addEventListener('touchend', handleEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleStart)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [onSwipeFromLeft, onSwipeFromRight])
}
