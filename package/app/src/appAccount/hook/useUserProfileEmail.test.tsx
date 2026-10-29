import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ErrorRest } from 'model/api'

import { useUserProfileEmail } from './useUserProfileEmail'
import { getUserProfileApi } from '../registry'

jest.mock('hook', () => ({
  useAuth: () => ({ authRefresh: jest.fn() }),
}))

jest.mock('../registry', () => ({
  getUserProfileApi: jest.fn(),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
)

const failWith = async (ref: string, message: string) => {
  ;(getUserProfileApi as jest.Mock).mockReturnValue({
    updateEmail: jest.fn().mockRejectedValue(new ErrorRest({ ref, message })),
  })
  const { result } = renderHook(() => useUserProfileEmail(), { wrapper })
  await act(async () => {
    await result.current
      .updateEmail({ email: 'a+b@example.com', currentPassword: 'x' })
      .catch(() => {})
  })
  await waitFor(() => expect(result.current.error).not.toBeNull())
  return result.current.error
}

describe('useUserProfileEmail error mapping', () => {
  it('maps the plus address ref to a specific message', async () => {
    expect(await failWith('ERROR_EMAIL_PLUS_ADDRESS', 'raw')).toBe(
      "Plus addresses aren't supported. Please use your plain email address.",
    )
  })

  it('maps the disposable domain ref', async () => {
    expect(await failWith('ERROR_DISPOSABLE_EMAIL_DOMAIN', 'raw')).toBe(
      'Please use a permanent email address',
    )
  })
})
