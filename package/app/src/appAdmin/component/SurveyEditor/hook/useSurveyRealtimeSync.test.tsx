import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RealtimeEvent } from 'veysur-common'

import { KEY_STATE_SURVEY_EDITING } from 'appAdmin/common'
import { useSurveyRealtimeSync } from './useSurveyRealtimeSync'

type EventListener = (event: RealtimeEvent) => void

const listeners = {
  event: new Set<EventListener>(),
  connect: new Set<() => void>(),
}
const leave = jest.fn()
const joinSurveyRoom = jest.fn(() => leave)

jest.mock('registry', () => ({
  getSocketClient: () => ({
    clientId: 'me',
    joinSurveyRoom,
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

const changed = (payload: unknown): RealtimeEvent => ({
  type: 'survey.changed',
  payload,
})

describe('useSurveyRealtimeSync', () => {
  let queryClient: QueryClient
  let invalidate: jest.SpyInstance

  const render = (projectId?: string, surveyId?: string) =>
    renderHook(() => useSurveyRealtimeSync(projectId, surveyId), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

  const emit = (event: RealtimeEvent) =>
    listeners.event.forEach((listener) => listener(event))

  beforeEach(() => {
    jest.clearAllMocks()
    listeners.event.clear()
    listeners.connect.clear()
    queryClient = new QueryClient()
    invalidate = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)
  })

  it('joins the survey room and leaves on unmount', () => {
    const { unmount } = render('p1', 's1')

    expect(joinSurveyRoom).toHaveBeenCalledWith('p1', 's1')
    unmount()

    expect(leave).toHaveBeenCalled()
    expect(listeners.event.size).toBe(0)
    expect(listeners.connect.size).toBe(0)
  })

  it('does nothing without a project and survey', () => {
    render(undefined, 's1')

    expect(joinSurveyRoom).not.toHaveBeenCalled()
  })

  it('invalidates the survey when another client changed it', () => {
    render('p1', 's1')

    emit(changed({ surveyId: 's1', originClientId: 'other' }))

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_EDITING, 's1'],
    })
  })

  it('ignores its own changes, other surveys and other event types', () => {
    render('p1', 's1')

    emit(changed({ surveyId: 's1', originClientId: 'me' }))
    emit(changed({ surveyId: 's2', originClientId: 'other' }))
    emit({ type: 'notification.changed' })

    expect(invalidate).not.toHaveBeenCalled()
  })

  it('invalidates on reconnect to catch missed changes', () => {
    render('p1', 's1')

    listeners.connect.forEach((listener) => listener())

    expect(invalidate).toHaveBeenCalledTimes(1)
  })
})
