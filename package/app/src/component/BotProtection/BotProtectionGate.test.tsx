import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { BotProtectionGate } from './BotProtectionGate'

const mockSolve = jest.fn()

jest.mock('./loadBotProtectionProvider', () => ({
  loadBotProtectionProvider: async () => ({ solve: mockSolve }),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('BotProtectionGate', () => {
  const verify = jest.fn()
  const fetchChallenge = jest.fn()

  const renderGate = (verified = false, provider = 'simple' as const) =>
    render(
      <BotProtectionGate
        provider={provider}
        siteKey="site"
        verified={verified}
        fetchChallenge={fetchChallenge}
        verify={verify}
      />,
    )

  beforeEach(() => {
    jest.clearAllMocks()
    mockSolve.mockResolvedValue('the-token')
    verify.mockResolvedValue(undefined)
  })

  test('solves the check and verifies the token with the honeypot value', async () => {
    renderGate()

    expect(screen.getByText('botProtection.checking')).toBeInTheDocument()
    await waitFor(() => expect(verify).toHaveBeenCalledWith('the-token', ''))
    expect(
      await screen.findByText('botProtection.verified'),
    ).toBeInTheDocument()
    expect(mockSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        siteKey: 'site',
        fetchChallenge: expect.any(Function),
      }),
    )
  })

  test('reports the honeypot when something fills it in', async () => {
    mockSolve.mockImplementation(async () => {
      const honeypot = document.querySelector<HTMLInputElement>(
        'input[name="website"]',
      )
      if (honeypot) honeypot.value = 'spam'
      return 'the-token'
    })
    renderGate()

    await waitFor(() =>
      expect(verify).toHaveBeenCalledWith('the-token', 'spam'),
    )
    await screen.findByText('botProtection.verified')
  })

  test('does nothing when the check has already passed', () => {
    renderGate(true)

    expect(mockSolve).not.toHaveBeenCalled()
    expect(screen.getByText('botProtection.verified')).toBeInTheDocument()
  })

  test('offers a retry after a failure', async () => {
    mockSolve.mockRejectedValueOnce(new Error('network'))
    renderGate()

    fireEvent.click(
      await screen.findByRole('button', { name: 'botProtection.retry' }),
    )

    await screen.findByText('botProtection.verified')
    expect(verify).toHaveBeenCalledTimes(1)
    expect(mockSolve).toHaveBeenCalledTimes(2)
  })

  test('names a third-party provider but not VeySur Bot Detection', async () => {
    const { unmount } = renderGate(false, 'simple')
    await screen.findByText('botProtection.verified')
    expect(
      screen.queryByText('botProtection.providerCloudflare'),
    ).not.toBeInTheDocument()
    unmount()

    renderGate(false, 'cloudflare' as never)
    await screen.findByText('botProtection.verified')
    expect(
      screen.getByText('botProtection.providerCloudflare'),
    ).toBeInTheDocument()
  })
})
