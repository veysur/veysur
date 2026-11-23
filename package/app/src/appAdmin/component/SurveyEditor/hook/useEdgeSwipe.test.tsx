import { renderHook } from '@testing-library/react'

import { useEdgeSwipe } from './useEdgeSwipe'

function swipe(from: [number, number], to: [number, number]) {
  const touch = (x: number, y: number) => ({ clientX: x, clientY: y }) as Touch
  const start = new Event('touchstart') as TouchEvent
  Object.assign(start, { touches: [touch(...from)] })
  document.dispatchEvent(start)
  const end = new Event('touchend') as TouchEvent
  Object.assign(end, { changedTouches: [touch(...to)] })
  document.dispatchEvent(end)
}

describe('useEdgeSwipe', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: 400,
      configurable: true,
    })
  })

  it('fires the left handler for an inward swipe from the left edge', () => {
    const onSwipeFromLeft = jest.fn()
    const onSwipeFromRight = jest.fn()
    renderHook(() => useEdgeSwipe({ onSwipeFromLeft, onSwipeFromRight }))

    swipe([5, 300], [120, 310])

    expect(onSwipeFromLeft).toHaveBeenCalledTimes(1)
    expect(onSwipeFromRight).not.toHaveBeenCalled()
  })

  it('fires the right handler for an inward swipe from the right edge', () => {
    const onSwipeFromRight = jest.fn()
    renderHook(() => useEdgeSwipe({ onSwipeFromRight }))

    swipe([395, 300], [280, 300])

    expect(onSwipeFromRight).toHaveBeenCalledTimes(1)
  })

  it('ignores swipes that start away from an edge, are mostly vertical or too short', () => {
    const onSwipeFromLeft = jest.fn()
    renderHook(() => useEdgeSwipe({ onSwipeFromLeft }))

    swipe([100, 300], [220, 300])
    swipe([5, 300], [80, 500])
    swipe([5, 300], [30, 300])

    expect(onSwipeFromLeft).not.toHaveBeenCalled()
  })

  it('is inactive at desktop width and while a dialog is open', () => {
    const onSwipeFromLeft = jest.fn()
    renderHook(() => useEdgeSwipe({ onSwipeFromLeft }))

    Object.defineProperty(window, 'innerWidth', {
      value: 1280,
      configurable: true,
    })
    swipe([5, 300], [120, 300])

    Object.defineProperty(window, 'innerWidth', {
      value: 400,
      configurable: true,
    })
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)
    swipe([5, 300], [120, 300])
    dialog.remove()

    expect(onSwipeFromLeft).not.toHaveBeenCalled()
  })
})
