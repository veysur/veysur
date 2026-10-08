import { renderHook } from '@testing-library/react'

import { EMBED_RESIZE_MESSAGE, useEmbedResize } from './useEmbedResize'

describe('useEmbedResize', () => {
  let notify: () => void = () => undefined
  const disconnect = jest.fn()
  let rootHeight = 0
  let postMessage: jest.SpyInstance

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    document.getElementById('root')!.getBoundingClientRect = () =>
      ({ height: rootHeight }) as DOMRect

    class FakeResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        notify = () => callback([], this)
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect
    }
    global.ResizeObserver = FakeResizeObserver
    postMessage = jest.spyOn(window.parent, 'postMessage').mockImplementation()
  })

  afterEach(() => {
    postMessage.mockRestore()
    disconnect.mockClear()
  })

  test('posts the root height on mount and whenever it changes, including shrinking', () => {
    rootHeight = 300.4
    renderHook(() => useEmbedResize('s1'))

    rootHeight = 220
    notify()

    expect(postMessage.mock.calls.map(([message]) => message.height)).toEqual([
      301, 220,
    ])
    expect(postMessage.mock.calls[0][0]).toMatchObject({
      type: EMBED_RESIZE_MESSAGE,
      surveyId: 's1',
    })
  })

  test('stops observing on unmount', () => {
    const { unmount } = renderHook(() => useEmbedResize('s1'))

    unmount()

    expect(disconnect).toHaveBeenCalled()
  })
})
