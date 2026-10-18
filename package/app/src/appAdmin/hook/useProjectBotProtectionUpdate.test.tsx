import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { KEY_STATE_SETTING_PROJECT } from 'appAdmin/common'

import { useProjectBotProtectionUpdate } from './useProjectBotProtectionUpdate'

const mockUpdateBotProtection = jest.fn()

jest.mock('appAdmin/registry/getSettingProjectApi', () => ({
  getSettingProjectApi: () => ({
    updateBotProtection: mockUpdateBotProtection,
  }),
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
    ...renderHook(() => useProjectBotProtectionUpdate('proj_1'), { wrapper }),
  }
}

const input = {
  provider: 'cloudflare',
  cloudflare: { siteKey: ' site ', secretKey: ' secret ' },
  google: { siteKey: '', secretKey: '' },
}

describe('useProjectBotProtectionUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateBotProtection.mockResolvedValue({ _id: 's1' })
  })

  it('sends the provider with trimmed keys', async () => {
    const { result } = setup()

    await result.current.updateBotProtection(input)

    expect(mockUpdateBotProtection).toHaveBeenCalledWith({
      provider: 'cloudflare',
      cloudflare: { siteKey: 'site', secretKey: 'secret' },
      google: { siteKey: '', secretKey: '' },
    })
  })

  it('invalidates the project settings for the project', async () => {
    const { result, queryClient } = setup()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await result.current.updateBotProtection(input)

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SETTING_PROJECT, 'proj_1'],
    })
  })
})
