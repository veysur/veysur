import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useSurveyAuth } from './useSurveyAuth'

const mockAuthenticate = jest.fn()
const mockBotVerify = jest.fn()
const mockBotChallenge = jest.fn()

jest.mock('appSurvey/registry', () => ({
  getAuthParticipantApi: () => ({
    authenticate: mockAuthenticate,
    botVerify: mockBotVerify,
    botChallenge: mockBotChallenge,
  }),
}))

jest.mock('../i18n', () => ({ __esModule: true, default: { t: () => '' } }))

describe('useSurveyAuth bot protection', () => {
  const stamp = {
    created: '2026-01-01T00:00:00Z',
    expires: '2026-01-01T03:00:00Z',
  }

  const setup = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    return renderHook(() => useSurveyAuth('s1'), { wrapper })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthenticate.mockResolvedValue({
      jwt: 'jwt-unverified',
      ...stamp,
      botProtection: { provider: 'simple', siteKey: '' },
      botVerified: false,
    })
    mockBotVerify.mockResolvedValue({ jwt: 'jwt-verified', ...stamp })
  })

  test('exposes the requirement and an unverified state from auth', async () => {
    const { result } = setup()

    await waitFor(() => expect(result.current.jwt).toBe('jwt-unverified'))
    expect(result.current.botProtection).toEqual({
      provider: 'simple',
      siteKey: '',
    })
    expect(result.current.botVerified).toBe(false)
  })

  test('verifyBot swaps the cached JWT in place without authenticating again', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.jwt).toBe('jwt-unverified'))

    await act(() => result.current.verifyBot('widget-token', 'honeypot'))

    expect(mockBotVerify).toHaveBeenCalledWith(
      's1',
      'jwt-unverified',
      'widget-token',
      'honeypot',
    )
    await waitFor(() => expect(result.current.jwt).toBe('jwt-verified'))
    expect(result.current.botVerified).toBe(true)
    expect(result.current.botProtection).toEqual({
      provider: 'simple',
      siteKey: '',
    })
    expect(mockAuthenticate).toHaveBeenCalledTimes(1)
  })

  test('fetchBotChallenge asks the API with the current JWT', async () => {
    mockBotChallenge.mockResolvedValue({
      challenge: 'c',
      bits: 18,
      minSeconds: 1,
    })
    const { result } = setup()
    await waitFor(() => expect(result.current.jwt).toBe('jwt-unverified'))

    await expect(result.current.fetchBotChallenge()).resolves.toEqual({
      challenge: 'c',
      bits: 18,
      minSeconds: 1,
    })
    expect(mockBotChallenge).toHaveBeenCalledWith('s1', 'jwt-unverified')
  })

  test('counts a survey with no bot check as verified', async () => {
    mockAuthenticate.mockResolvedValue({
      jwt: 'jwt-1',
      ...stamp,
      botProtection: { provider: 'none', siteKey: '' },
      botVerified: true,
    })
    const { result } = setup()

    await waitFor(() => expect(result.current.jwt).toBe('jwt-1'))
    expect(result.current.botVerified).toBe(true)
  })
})
