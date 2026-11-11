import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ErrorRest } from 'model/api'

import { LoginForm } from './LoginForm'

jest.mock('model', () => ({
  AuthDomain: {
    markLoginSubmitted: jest.fn(),
    clearLoginSubmitted: jest.fn(),
    getAccountUrl: jest.fn((path?: string) =>
      path
        ? `https://account.example.com/${path}`
        : 'https://account.example.com/',
    ),
  },
}))

const mockLoginDefaults = jest.fn()
const mockLoginEmailPassword = jest.fn()
const mockSetupAndLogin = jest.fn()
const mockGetSetupDataForced = jest.fn()

jest.mock('registry', () => ({
  getApiAuth: () => ({ getSetupDataForced: mockGetSetupDataForced }),
  getLoginDefaults: () => mockLoginDefaults,
}))

let mockBotCheckReady = true
const mockTake = jest.fn()

jest.mock('hook', () => ({
  useAccountBotCheck: () => ({
    ready: mockBotCheckReady,
    take: mockTake,
    element: <div>bot-check</div>,
  }),
  useAuth: () => ({
    loginEmailPassword: mockLoginEmailPassword,
    setupAndLogin: mockSetupAndLogin,
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoginDefaults.mockReturnValue(null)
    mockLoginEmailPassword.mockResolvedValue(true)
    mockBotCheckReady = true
    mockSetupAndLogin.mockResolvedValue(undefined)
    mockGetSetupDataForced.mockResolvedValue({
      secret: 'SECRET123',
      otpauthUri: 'otpauth://totp/test?secret=SECRET123',
    })
    mockTake.mockReturnValue({ token: 'solved:1', honeypot: '' })
  })

  it('shows the bot check and holds the button until it is ready', () => {
    mockBotCheckReady = false

    render(<LoginForm />)

    expect(screen.getByText('bot-check')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled()
  })

  it('does not auto-submit before the bot check is ready', () => {
    mockBotCheckReady = false
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
      autoSubmit: true,
    })

    render(<LoginForm />)

    expect(mockLoginEmailPassword).not.toHaveBeenCalled()
  })

  it('does not sign in on its own by default', () => {
    mockLoginDefaults.mockReturnValue({ email: 'a@b.test', password: 'pw' })

    render(<LoginForm />)

    expect(mockLoginEmailPassword).not.toHaveBeenCalled()
  })

  it('signs in once on mount when the defaults ask for auto-submit', async () => {
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
      autoSubmit: true,
    })

    const { rerender } = render(<LoginForm />)
    rerender(<LoginForm />)

    await waitFor(() =>
      expect(mockLoginEmailPassword).toHaveBeenCalledWith(
        'demo@example.com',
        'demo-password',
        false,
        { token: 'solved:1', honeypot: '' },
      ),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /login/i })).toBeEnabled(),
    )
    expect(mockLoginEmailPassword).toHaveBeenCalledTimes(1)
  })

  it('signs in with the defaults even when the browser autofilled other credentials', async () => {
    mockBotCheckReady = false
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
      autoSubmit: true,
    })

    const { rerender } = render(<LoginForm />)
    fireEvent.input(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.input(screen.getByLabelText('Password'), {
      target: { value: 'admin-password' },
    })

    mockBotCheckReady = true
    rerender(<LoginForm />)

    await waitFor(() =>
      expect(mockLoginEmailPassword).toHaveBeenCalledWith(
        'demo@example.com',
        'demo-password',
        false,
        { token: 'solved:1', honeypot: '' },
      ),
    )
  })

  it('shows the auto-submit message while signing in', async () => {
    mockLoginEmailPassword.mockReturnValue(new Promise(() => undefined))
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
      autoSubmit: true,
      autoSubmitMessage: 'Opening the demo…',
    })

    render(<LoginForm />)

    expect(await screen.findByText('Opening the demo…')).toBeInTheDocument()
    await waitFor(() => expect(mockLoginEmailPassword).toHaveBeenCalled())
  })

  it('hides the form behind a status spinner while auto-signing in', async () => {
    mockLoginEmailPassword.mockReturnValue(new Promise(() => undefined))
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
      autoSubmit: true,
    })

    render(<LoginForm />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Email').closest('form')).toHaveClass('hidden')
    await waitFor(() => expect(mockLoginEmailPassword).toHaveBeenCalled())
  })

  it('shows the form and the error when auto sign-in fails', async () => {
    mockLoginEmailPassword.mockRejectedValue(new Error('boom'))
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
      autoSubmit: true,
    })

    render(<LoginForm />)

    expect(
      await screen.findByText('An unexpected error occurred'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email').closest('form')).not.toHaveClass(
      'hidden',
    )
  })

  it('does not show the spinner for a plain login', () => {
    render(<LoginForm />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('leaves the fields empty when no login defaults are registered', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toHaveValue('')
    expect(screen.getByLabelText(/password/i)).toHaveValue('')
  })

  it('pre-fills the fields from the registered login defaults', () => {
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
    })

    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toHaveValue('demo@example.com')
    expect(screen.getByLabelText(/password/i)).toHaveValue('demo-password')
  })

  it('asks password managers to skip the fields only when auto-submitting', () => {
    mockLoginDefaults.mockReturnValue({
      email: 'demo@example.com',
      password: 'demo-password',
      autoSubmit: true,
    })
    const { unmount } = render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute(
      'data-lpignore',
      'true',
    )
    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      'data-lpignore',
      'true',
    )
    unmount()

    mockLoginDefaults.mockReturnValue(null)
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).not.toHaveAttribute('data-lpignore')
  })

  it('points "Forgot password?" at the account app via AuthDomain.getAccountUrl, not an in-app route', () => {
    render(<LoginForm />)

    const link = screen.getByRole('link', { name: 'Forgot password?' })
    expect(link).toHaveAttribute(
      'href',
      'https://account.example.com/password-reset',
    )
  })
  describe('two-factor setup', () => {
    const startSetup = async () => {
      mockLoginEmailPassword.mockResolvedValue({
        requiresTwoFactorSetup: true,
        preAuthToken: 'pre-token',
      })
      render(<LoginForm />)
      fireEvent.input(screen.getByLabelText('Email'), {
        target: { value: 'a@b.test' },
      })
      fireEvent.input(screen.getByLabelText('Password'), {
        target: { value: 'pw' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Login' }))
      await screen.findByText('Set Up Two-Factor Authentication')
      await act(async () => {})
    }

    const enterCode = (code: string) =>
      fireEvent.paste(screen.getAllByRole('textbox')[0], {
        clipboardData: { getData: () => code },
      })

    it('loads the setup data with the pre-auth token and shows the secret', async () => {
      await startSetup()

      expect(await screen.findByDisplayValue('SECRET123')).toBeInTheDocument()
      expect(mockGetSetupDataForced).toHaveBeenCalledWith('pre-token')
    })

    it('shows the load error when the setup data cannot be fetched', async () => {
      mockGetSetupDataForced.mockRejectedValue(
        new ErrorRest({ userMessage: 'Setup unavailable' }),
      )
      await startSetup()

      expect(await screen.findByText('Setup unavailable')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    })

    it('returns to the credentials form from "Back to login"', async () => {
      await startSetup()

      fireEvent.click(screen.getByRole('button', { name: 'Back to login' }))

      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('goes to the confirm step and back to the QR step', async () => {
      await startSetup()
      fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))

      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Back' }))
      })
      expect(
        screen.getByText('Set Up Two-Factor Authentication'),
      ).toBeInTheDocument()
      expect(mockGetSetupDataForced).toHaveBeenCalledTimes(2)
    })

    it('enables 2FA with the code, secret and token when the code is complete', async () => {
      await startSetup()
      fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))

      enterCode('123456')

      await waitFor(() =>
        expect(mockSetupAndLogin).toHaveBeenCalledWith(
          'pre-token',
          '123456',
          'SECRET123',
          false,
        ),
      )
    })

    it('shows the error message when enabling fails', async () => {
      mockSetupAndLogin.mockRejectedValue(
        new ErrorRest({ userMessage: 'Wrong code' }),
      )
      await startSetup()
      fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))

      enterCode('123456')

      expect(await screen.findByText('Wrong code')).toBeInTheDocument()
    })

    it('copies the secret to the clipboard', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })
      await startSetup()

      fireEvent.click(await screen.findByRole('button', { name: 'Copy' }))

      expect(writeText).toHaveBeenCalledWith('SECRET123')
      expect(
        await screen.findByRole('button', { name: 'Copied!' }),
      ).toBeInTheDocument()
    })
  })
})
