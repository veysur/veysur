import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useCountryAccess } from './useCountryAccess'
import { getGeoApi } from 'registry'

jest.mock('registry', () => ({
  getGeoApi: jest.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useCountryAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reports not blocked when access-check resolves blocked: false', async () => {
    const accessCheck = jest
      .fn()
      .mockResolvedValue({ country: 'GB', blocked: false })
    ;(getGeoApi as jest.Mock).mockReturnValue({ accessCheck })

    const { result } = renderHook(() => useCountryAccess(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.blocked).toBe(false)
    expect(accessCheck).toHaveBeenCalledWith()
  })

  it('reports blocked when access-check resolves blocked: true', async () => {
    const accessCheck = jest
      .fn()
      .mockResolvedValue({ country: 'CH', blocked: true })
    ;(getGeoApi as jest.Mock).mockReturnValue({ accessCheck })

    const { result } = renderHook(() => useCountryAccess(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.blocked).toBe(true)
  })

  it('fails open (not blocked) when the access-check request errors', async () => {
    const accessCheck = jest.fn().mockRejectedValue(new Error('network error'))
    ;(getGeoApi as jest.Mock).mockReturnValue({ accessCheck })

    const { result } = renderHook(() => useCountryAccess(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.blocked).toBe(false)
  })
})
