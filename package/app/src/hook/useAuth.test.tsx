import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  KEY_STATE_AUTH,
  KEY_STATE_REMEMBER_ME,
  KEY_STATE_SIGNUP_REMEMBER_PENDING,
} from 'common/keyState'
import { useAuth } from './useAuth'

const signupMock = jest.fn()
const deleteMock = jest.fn()

jest.mock('registry', () => ({
  getApiAuth: () => ({ signup: signupMock, delete: deleteMock }),
  getRestClient: () => ({
    setJwtRefresher: jest.fn(),
    setDefaultHeaders: jest.fn(),
  }),
}))
jest.mock('common/queryClient', () => ({
  clearPersistedCache: jest.fn(),
}))

const authResult = {
  client: { _id: 'c1' },
  user: { email: 'a@b.test' },
  accessToken: { token: 't' },
  jwt: { token: 'j' },
}

const setup = () => {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useAuth(), { wrapper })
  return { client, ...hook }
}

// The hook's initial auth query resolves to null; let it settle before writing auth.
const settled = (client: QueryClient) =>
  waitFor(() => expect(client.isFetching()).toBe(0))

describe('useAuth signup remember-me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    signupMock.mockResolvedValue(authResult)
  })

  it('holds auth in the remembered tier and sets the pending flag', async () => {
    const { client, result } = setup()
    await settled(client)
    await result.current.signupEmailPassword({
      nameFirst: 'A',
      nameLast: 'B',
      email: 'a@b.test',
      password: 'x',
    })
    expect(client.getQueryData([KEY_STATE_REMEMBER_ME])).toBe(true)
    expect(client.getQueryData([KEY_STATE_SIGNUP_REMEMBER_PENDING])).toBe(false)
    await waitFor(() =>
      expect(client.getQueryData([KEY_STATE_AUTH])).toBeTruthy(),
    )
  })

  it('clears the pending flag on logout', async () => {
    const { client, result } = setup()
    await settled(client)
    await result.current.signupEmailPassword({
      nameFirst: 'A',
      nameLast: 'B',
      email: 'a@b.test',
      password: 'x',
    })
    result.current.logout()
    expect(
      client.getQueryData([KEY_STATE_SIGNUP_REMEMBER_PENDING]),
    ).toBeUndefined()
    expect(client.getQueryData([KEY_STATE_REMEMBER_ME])).toBeUndefined()
  })
})
