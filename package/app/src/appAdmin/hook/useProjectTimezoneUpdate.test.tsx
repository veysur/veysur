import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useProjectTimezoneUpdate } from './useProjectTimezoneUpdate'
import { KEY_STATE_PROJECT_DOMAIN } from 'appAdmin/common'

const mockUpdateTimezone = jest.fn()
const mockAuthRefresh = jest.fn()

jest.mock('appAdmin/registry/getProjectApi', () => ({
  getProjectApi: () => ({ updateTimezone: mockUpdateTimezone }),
}))

jest.mock('hook/useAuth', () => ({
  useAuth: () => ({
    authRefresh: mockAuthRefresh,
    authRefreshWithRetry: jest.fn(),
  }),
}))

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return {
    queryClient,
    ...renderHook(() => useProjectTimezoneUpdate('proj_1'), { wrapper }),
  }
}

describe('useProjectTimezoneUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateTimezone.mockResolvedValue({ _id: 'proj_1' })
    mockAuthRefresh.mockResolvedValue(undefined)
  })

  it('sends the new timezone for the project', async () => {
    const { result } = setup()

    await result.current.updateTimezone('Australia/Sydney')

    expect(mockUpdateTimezone).toHaveBeenCalledWith(
      'proj_1',
      'Australia/Sydney',
    )
  })

  it('force-refreshes auth after saving, since the project derives from it', async () => {
    const { result } = setup()

    await result.current.updateTimezone('Australia/Sydney')

    expect(mockAuthRefresh).toHaveBeenCalledWith(true)
    expect(mockUpdateTimezone.mock.invocationCallOrder[0]).toBeLessThan(
      mockAuthRefresh.mock.invocationCallOrder[0],
    )
  })

  it('does not invalidate the project domain query', async () => {
    const { result, queryClient } = setup()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await result.current.updateTimezone('Australia/Sydney')

    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: [KEY_STATE_PROJECT_DOMAIN],
    })
  })

  it('does not refresh auth when the save fails', async () => {
    mockUpdateTimezone.mockRejectedValue(new Error('nope'))
    const { result } = setup()

    await expect(result.current.updateTimezone('Bad/Zone')).rejects.toThrow(
      'nope',
    )
    expect(mockAuthRefresh).not.toHaveBeenCalled()
  })
})
