import { render, screen, waitFor } from '@testing-library/react'

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

jest.mock('registry', () => ({
  getApiAuth: jest.fn(),
  getLoginDefaults: () => mockLoginDefaults,
}))

jest.mock('hook', () => ({
  useAuth: () => ({
    loginEmailPassword: mockLoginEmailPassword,
    setupAndLogin: jest.fn(),
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoginDefaults.mockReturnValue(null)
    mockLoginEmailPassword.mockResolvedValue(true)
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
      ),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /login/i })).toBeEnabled(),
    )
    expect(mockLoginEmailPassword).toHaveBeenCalledTimes(1)
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

  it('points "Forgot password?" at the account app via AuthDomain.getAccountUrl, not an in-app route', () => {
    render(<LoginForm />)

    const link = screen.getByRole('link', { name: 'Forgot password?' })
    expect(link).toHaveAttribute(
      'href',
      'https://account.example.com/password-reset',
    )
  })
})
