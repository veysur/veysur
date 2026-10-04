import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RealtimeEvent } from 'veysur-common'

import { useRealtimeInvalidation } from './useRealtimeInvalidation'

type EventListener = (event: RealtimeEvent) => void

const listeners = {
  event: new Set<EventListener>(),
  connect: new Set<() => void>(),
}

jest.mock('registry', () => ({
  getSocketClient: () => ({
    onEvent: (listener: EventListener) => {
      listeners.event.add(listener)
      return () => listeners.event.delete(listener)
    },
    onConnect: (listener: () => void) => {
      listeners.connect.add(listener)
      return () => listeners.connect.delete(listener)
    },
  }),
}))

const map = { 'a.changed': [['keyA']], 'b.changed': [['keyB'], ['keyC']] }

describe('useRealtimeInvalidation', () => {
  let queryClient: QueryClient
  let invalidate: jest.SpyInstance

  const render = () =>
    renderHook(() => useRealtimeInvalidation(map), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

  beforeEach(() => {
    listeners.event.clear()
    listeners.connect.clear()
    queryClient = new QueryClient()
    invalidate = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)
  })

  it('invalidates the keys mapped to an event type', () => {
    render()

    listeners.event.forEach((listener) => listener({ type: 'b.changed' }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['keyB'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['keyC'] })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['keyA'] })
  })

  it('ignores unmapped event types', () => {
    render()

    listeners.event.forEach((listener) => listener({ type: 'other' }))

    expect(invalidate).not.toHaveBeenCalled()
  })

  it('invalidates every mapped key on connect', () => {
    render()

    listeners.connect.forEach((listener) => listener())

    expect(invalidate).toHaveBeenCalledTimes(3)
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = render()

    unmount()

    expect(listeners.event.size).toBe(0)
    expect(listeners.connect.size).toBe(0)
  })
})
