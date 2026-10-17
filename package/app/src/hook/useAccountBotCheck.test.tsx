import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import '@testing-library/jest-dom'

import { useAccountBotCheck } from './useAccountBotCheck'

const mockAccountChallenge = jest.fn()
const mockSolve = jest.fn()

jest.mock('registry', () => ({
  getApiBotProtection: () => ({ accountChallenge: mockAccountChallenge }),
}))

jest.mock('component/BotProtection/loadBotProtectionProvider', () => ({
  loadBotProtectionProvider: async () => ({ solve: mockSolve }),
}))

const challenge = { enabled: true, challenge: 'c', bits: 4, minSeconds: 0 }

describe('useAccountBotCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAccountChallenge.mockResolvedValue(challenge)
    mockSolve.mockImplementation(
      async ({
        fetchChallenge,
      }: {
        fetchChallenge: () => Promise<{ challenge: string }>
      }) => `${(await fetchChallenge()).challenge}:7`,
    )
  })

  it('is ready with no element when the deployment has the check off', async () => {
    mockAccountChallenge.mockResolvedValue({ enabled: false })

    const { result } = renderHook(() => useAccountBotCheck())

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.element).toBeNull()
    act(() => {
      expect(result.current.take()).toBeUndefined()
    })
  })

  it('is not ready until the proof of work is solved, then hands it over once', async () => {
    const { result } = renderHook(() => useAccountBotCheck())
    expect(result.current.ready).toBe(false)
    await waitFor(() => expect(result.current.element).not.toBeNull())

    render(<>{result.current.element}</>)
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(mockAccountChallenge).toHaveBeenCalledTimes(1)

    let botCheck
    act(() => {
      botCheck = result.current.take()
    })
    expect(botCheck).toEqual({ token: 'c:7', honeypot: '' })
    expect(result.current.ready).toBe(false)
  })

  it('shows the retry when the challenge cannot be fetched', async () => {
    mockAccountChallenge.mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useAccountBotCheck())
    await waitFor(() => expect(result.current.element).not.toBeNull())

    render(<>{result.current.element}</>)
    expect(await screen.findByText('Try again')).toBeInTheDocument()
    expect(result.current.ready).toBe(false)
  })
})
