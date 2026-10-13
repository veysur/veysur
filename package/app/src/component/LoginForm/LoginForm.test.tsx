import { render, screen } from '@testing-library/react'

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

jest.mock('registry', () => ({
  getApiAuth: jest.fn(),
  getLoginDefaults: () => mockLoginDefaults,
}))

jest.mock('hook', () => ({
  useAuth: () => ({
    loginEmailPassword: jest.fn(),
    setupAndLogin: jest.fn(),
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    mockLoginDefaults.mockReturnValue(null)
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
