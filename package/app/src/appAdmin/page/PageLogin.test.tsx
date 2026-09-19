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
    prepareTargetWindow: jest.fn(),
    closeTargetWindow: jest.fn(),
    onAuthDomain: jest.fn(),
    isTargetDomainAuthorized: jest.fn(),
    getAccountUrl: jest.fn(
      (path?: string) => `https://account.example.com/${path ?? ''}`,
    ),
  },
  AuthDomainPopup: {
    readAuthMessage: jest.fn(),
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

    // Verify prepareTargetWindow and handleAuthed were NOT called yet (waiting for user click)
    expect(AuthDomain.prepareTargetWindow).not.toHaveBeenCalled()
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })

  it('does not call prepareTargetWindow when not on auth domain', () => {
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

    // Verify prepareTargetWindow was NOT called
    expect(AuthDomain.prepareTargetWindow).not.toHaveBeenCalled()

    // handleAuthed is not called when requireNoReturnToForHandleAuthed is true and
    // returnTo is present — the broadcast relay / Navigate handles routing instead
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })

  it('does not call prepareTargetWindow when no returnTo parameter', () => {
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

    // Verify prepareTargetWindow was NOT called
    expect(AuthDomain.prepareTargetWindow).not.toHaveBeenCalled()

    // Verify handleAuthed was still called
    expect(AuthDomain.handleAuthed).toHaveBeenCalledWith(
      expect.any(Function),
      mockAuth,
    )
  })

  it('calls handleAuth when not authenticated and not a popup window', () => {
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

    // window.opener is already null from beforeEach

    render(<PageLogin />, { wrapper: createWrapper() })

    // Verify handleAuth was called
    expect(AuthDomain.handleAuth).toHaveBeenCalled()

    // Verify prepareTargetWindow and handleAuthed were NOT called
    expect(AuthDomain.prepareTargetWindow).not.toHaveBeenCalled()
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })

  it('does not call handleAuth when in popup window', () => {
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

    // Mock window.opener as existing (is a popup)
    Object.defineProperty(window, 'opener', {
      value: {},
      writable: true,
      configurable: true,
    })

    render(<PageLogin />, { wrapper: createWrapper() })

    // Verify handleAuth was NOT called (popup windows don't redirect)
    expect(AuthDomain.handleAuth).not.toHaveBeenCalled()

    // Verify prepareTargetWindow and handleAuthed were NOT called either
    expect(AuthDomain.prepareTargetWindow).not.toHaveBeenCalled()
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })
})
