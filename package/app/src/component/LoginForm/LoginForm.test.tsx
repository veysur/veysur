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

jest.mock('registry', () => ({
  getApiAuth: jest.fn(),
}))

jest.mock('hook', () => ({
  useAuth: () => ({
    loginEmailPassword: jest.fn(),
    setupAndLogin: jest.fn(),
  }),
}))

describe('LoginForm', () => {
  it('points "Forgot password?" at the account app via AuthDomain.getAccountUrl, not an in-app route', () => {
    render(<LoginForm />)

    const link = screen.getByRole('link', { name: 'Forgot password?' })
    expect(link).toHaveAttribute(
      'href',
      'https://account.example.com/password-reset',
    )
  })
})
