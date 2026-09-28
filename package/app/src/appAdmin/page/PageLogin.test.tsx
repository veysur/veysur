import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PageLogin } from './PageLogin'
import { AuthDomain } from 'model'
import * as useAuthHook from 'hook'

// Mock the AuthDomain methods
jest.mock('model', () => ({
  AuthDomain: {
    handleAuth: jest.fn(),
    handleAuthed: jest.fn(),
    consumeLoginJustSubmitted: jest.fn().mockReturnValue(false),
    onAuthDomain: jest.fn(),
    isTargetDomainAuthorized: jest.fn(),
    getAccountUrl: jest.fn(
      (path?: string) => `https://account.example.com/${path ?? ''}`,
    ),
  },
}))

// Mock useAuth at its source module so useAuthLoginRedirect (which imports it directly)
// shares the same mock as the `hook` barrel re-export used by this test.
jest.mock('hook/useAuth', () => ({
  ...jest.requireActual('hook/useAuth'),
  useAuth: jest.fn(),
}))

// Mock the hooks
jest.mock('hook', () => ({
  ...jest.requireActual('hook'),
  useAuth: jest.requireMock('hook/useAuth').useAuth,
  usePageTitle: jest.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    )
  }
}

describe('PageLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock window.location.search
    delete (window as unknown as { location?: Location }).location
    ;(window as unknown as { location: Location }).location = {
      search: '',
      host: 'example.com',
    } as unknown as Location
    // Reset window.opener
    Object.defineProperty(window, 'opener', {
      value: null,
      writable: true,
      configurable: true,
    })
  })

  it('shows continue button when already authenticated on auth domain with returnTo', () => {
    const mockAuth = {
      client: { _id: 'client123' },
      user: {
        nameFirst: 'John',
        nameLast: 'Doe',
        email: 'john@example.com',
        projectOwn: [
          {
            _id: 'project123',
            createdById: 'user123',
            ownerId: 'user123',
            name: 'Test Project',
            domain: 'project.example.com',
            subdomain: 'project',
            status: 'active',
            timezone: 'UTC',
            projectSubscriptionId: null,
            emailSendingPaused: false,
            emailDailyQuota: 0,
            emailDailySent: 0,
            emailDailyResetAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        projectAdmin: [],
      },
      jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
      accessToken: {
        token: 'access-token',
        ip: '127.0.0.1',
        ttl: 3600,
        createdAt: new Date(),
        expiresAt: new Date(),
      },
    }

    // Mock user is authenticated
    jest.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      auth: mockAuth,
      isAuthed: true,
      setAuth: jest.fn(),
      logout: jest.fn(),
      loginEmailPassword: jest.fn(),
      verifyTwoFactor: jest.fn(),
      setupAndLogin: jest.fn(),
      signupEmailPassword: jest.fn(),
      authRefresh: jest.fn(),
      authRefreshWithRetry: jest.fn(),
    })

    // Mock being on auth domain with returnTo parameter
    jest.spyOn(AuthDomain, 'onAuthDomain').mockReturnValue(true)
    jest.spyOn(AuthDomain, 'isTargetDomainAuthorized').mockReturnValue(true)
    window.location.search = '?returnTo=https://project.example.com/admin'

    const { getByText } = render(<PageLogin />, { wrapper: createWrapper() })

    // Verify continue button is shown
    expect(getByText('Continue')).toBeInTheDocument()
    expect(getByText('You are already logged in.')).toBeInTheDocument()

    // Verify handleAuthed was NOT called yet (waiting for user click)
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })

  it('does not auto-proceed when not on auth domain', () => {
    const mockAuth = {
      client: { _id: 'client123' },
      user: {
        nameFirst: 'John',
        nameLast: 'Doe',
        email: 'john@example.com',
        projectOwn: [],
        projectAdmin: [],
      },
      jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
      accessToken: {
        token: 'access-token',
        ip: '127.0.0.1',
        ttl: 3600,
        createdAt: new Date(),
        expiresAt: new Date(),
      },
    }

    jest.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      auth: mockAuth,
      isAuthed: true,
      setAuth: jest.fn(),
      logout: jest.fn(),
      loginEmailPassword: jest.fn(),
      verifyTwoFactor: jest.fn(),
      setupAndLogin: jest.fn(),
      signupEmailPassword: jest.fn(),
      authRefresh: jest.fn(),
      authRefreshWithRetry: jest.fn(),
    })

    // Mock NOT being on auth domain
    jest.spyOn(AuthDomain, 'onAuthDomain').mockReturnValue(false)
    window.location.search = '?returnTo=https://project.example.com/admin'

    render(<PageLogin />, { wrapper: createWrapper() })

    // handleAuthed is not called when requireNoReturnToForHandleAuthed is true and
    // returnTo is present — the broadcast relay / Navigate handles routing instead
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })

  it('calls handleAuthed when no returnTo parameter', () => {
    const mockAuth = {
      client: { _id: 'client123' },
      user: {
        nameFirst: 'John',
        nameLast: 'Doe',
        email: 'john@example.com',
        projectOwn: [],
        projectAdmin: [],
      },
      jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
      accessToken: {
        token: 'access-token',
        ip: '127.0.0.1',
        ttl: 3600,
        createdAt: new Date(),
        expiresAt: new Date(),
      },
    }

    jest.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      auth: mockAuth,
      isAuthed: true,
      setAuth: jest.fn(),
      logout: jest.fn(),
      loginEmailPassword: jest.fn(),
      verifyTwoFactor: jest.fn(),
      setupAndLogin: jest.fn(),
      signupEmailPassword: jest.fn(),
      authRefresh: jest.fn(),
      authRefreshWithRetry: jest.fn(),
    })

    jest.spyOn(AuthDomain, 'onAuthDomain').mockReturnValue(true)
    window.location.search = '' // No returnTo parameter

    render(<PageLogin />, { wrapper: createWrapper() })

    // Verify handleAuthed was called
    expect(AuthDomain.handleAuthed).toHaveBeenCalledWith(
      expect.any(Function),
      mockAuth,
    )
  })

  it('calls handleAuth when not authenticated', () => {
    jest.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      auth: null,
      isAuthed: false,
      setAuth: jest.fn(),
      logout: jest.fn(),
      loginEmailPassword: jest.fn(),
      verifyTwoFactor: jest.fn(),
      setupAndLogin: jest.fn(),
      signupEmailPassword: jest.fn(),
      authRefresh: jest.fn(),
      authRefreshWithRetry: jest.fn(),
    })

    render(<PageLogin />, { wrapper: createWrapper() })

    // Verify handleAuth was called
    expect(AuthDomain.handleAuth).toHaveBeenCalled()

    // Verify handleAuthed was NOT called
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })
})
