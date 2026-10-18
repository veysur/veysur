import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { KEY_STATE_SETTING_PROJECT } from 'appAdmin/common'

import { useProjectMapsKeyUpdate } from './useProjectMapsKeyUpdate'

const mockUpdateMaps = jest.fn()

jest.mock('appAdmin/registry/getSettingProjectApi', () => ({
  getSettingProjectApi: () => ({ updateMaps: mockUpdateMaps }),
}))

jest.mock('hook/useAuth', () => ({
  useAuth: () => ({ authRefreshWithRetry: jest.fn() }),
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
    ...renderHook(() => useProjectMapsKeyUpdate('proj_1'), { wrapper }),
  }
}

describe('useProjectMapsKeyUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateMaps.mockResolvedValue({ _id: 's1' })
  })

  it('sends the trimmed key', async () => {
    const { result } = setup()

    await result.current.updateGoogleApiKey('  maps-key ')

    expect(mockUpdateMaps).toHaveBeenCalledWith('maps-key')
  })

  it('invalidates the project settings for the project', async () => {
    const { result, queryClient } = setup()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await result.current.updateGoogleApiKey('maps-key')

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SETTING_PROJECT, 'proj_1'],
    })
  })

  it('reports a failed save', async () => {
    mockUpdateMaps.mockRejectedValue(new Error('nope'))
    const { result } = setup()

    await expect(result.current.updateGoogleApiKey('k')).rejects.toThrow('nope')
  })
})
