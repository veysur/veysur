import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ErrorRest } from 'model/api'

import { useTeamInviteSend } from './useTeamInviteSend'
import { getTeamManagementApi } from '../registry'

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('../registry', () => ({
  getTeamManagementApi: jest.fn(),
}))

jest.mock('hook/useAuth', () => ({
  useAuth: () => ({ authRefreshWithRetry: jest.fn() }),
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

describe('useTeamInviteSend error mapping', () => {
  it('maps the plus address ref to a specific message', async () => {
    ;(getTeamManagementApi as jest.Mock).mockReturnValue({
      sendInvite: jest
        .fn()
        .mockRejectedValue(
          new ErrorRest({ ref: 'ERROR_EMAIL_PLUS_ADDRESS', message: 'raw' }),
        ),
    })
    const { result } = renderHook(() => useTeamInviteSend(), { wrapper })
    await act(async () => {
      await result.current
        .sendInvite({ nameFirst: 'A', email: 'a+b@example.com' })
        .catch(() => {})
    })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe(
      "Plus addresses aren't supported. Please use the plain email address.",
    )
  })
})
