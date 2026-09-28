import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useDismissNotification } from './useDismissNotification'
import { getNotificationApi } from '../registry'
import { KEY_STATE_NOTIFICATIONS } from 'appAdmin/common/keyState'
import type { ListNotificationsResponse } from '../model/api/NotificationApi'

const mockProject: { _id: string } | null = { _id: 'project-1' }

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => mockProject,
}))

jest.mock('../registry', () => ({
  getNotificationApi: jest.fn(),
}))

// authRefreshWithRetry is not under test here.
jest.mock('hook/useAuth', () => ({
  useAuth: () => ({ authRefreshWithRetry: jest.fn() }),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const queryKey = [KEY_STATE_NOTIFICATIONS, 'project-1']

const seedNotifications = (
  queryClient: QueryClient,
  notifications: ListNotificationsResponse['notifications'],
) => {
  queryClient.setQueryData<ListNotificationsResponse>(queryKey, {
    notifications,
    notificationCount: notifications.length,
  })
}

describe('useDismissNotification', () => {
  const mockDismiss = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getNotificationApi as jest.Mock).mockReturnValue({ dismiss: mockDismiss })
  })

  it('removes the dismissed notification from the cache immediately, before the request resolves', async () => {
    const queryClient = newQueryClient()
    seedNotifications(queryClient, [
      {
        notificationId: 'n1',
        type: 'dataTransferJob',
        level: 'success',
        title: 'Export ready',
        message: null,
        status: 'read',
        dataTransferJobId: 'job-1',
        createdAt: '2026-09-25T00:00:00.000Z',
      },
      {
        notificationId: 'n2',
        type: 'dataTransferJob',
        level: 'error',
        title: 'Import failed',
        message: null,
        status: 'read',
        dataTransferJobId: 'job-2',
        createdAt: '2026-09-25T00:00:00.000Z',
      },
    ])

    let resolveDismiss: () => void = () => {}
    mockDismiss.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDismiss = resolve
      }),
    )

    const { result } = renderHook(() => useDismissNotification(), {
      wrapper: createWrapper(queryClient),
    })

    const dismissPromise = result.current.dismissNotification('n1')

    // Optimistic removal happens synchronously with the mutation call,
    // well before the underlying API request settles.
    await waitFor(() => {
      const cached = queryClient.getQueryData<ListNotificationsResponse>(queryKey)
      expect(cached?.notifications.map((n) => n.notificationId)).toEqual(['n2'])
    })

    resolveDismiss()
    await dismissPromise

    const finalCache = queryClient.getQueryData<ListNotificationsResponse>(queryKey)
    expect(finalCache?.notifications.map((n) => n.notificationId)).toEqual(['n2'])
  })

  it('rolls back the optimistic removal if the request fails', async () => {
    const queryClient = newQueryClient()
    seedNotifications(queryClient, [
      {
        notificationId: 'n1',
        type: 'dataTransferJob',
        level: 'success',
        title: 'Export ready',
        message: null,
        status: 'read',
        dataTransferJobId: 'job-1',
        createdAt: '2026-09-25T00:00:00.000Z',
      },
    ])

    mockDismiss.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useDismissNotification(), {
      wrapper: createWrapper(queryClient),
    })

    await expect(result.current.dismissNotification('n1')).rejects.toThrow(
      'network error',
    )

    const cached = queryClient.getQueryData<ListNotificationsResponse>(queryKey)
    expect(cached?.notifications.map((n) => n.notificationId)).toEqual(['n1'])
  })
})
