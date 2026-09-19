import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  QueryClient,
  QueryClientProvider,
  useIsRestoring,
} from '@tanstack/react-query'

import { AuthGate } from './AuthGate'
import { AuthDomain } from 'model/service/AuthDomain/AuthDomain'
import { RedirectPending } from 'model'
import * as useAuthHook from 'hook'

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useIsRestoring: jest.fn(),
}))

// AuthGate.tsx imports AuthDomain directly from its module (not the `model` barrel), so it
// must be mocked at that same path for the spies below to intercept the component's calls.
jest.mock('model/service/AuthDomain/AuthDomain', () => ({
  AuthDomain: {
    hasAuthDomain: jest.fn(),
    onAuthDomain: jest.fn(),
    shouldBypassAuthDomain: jest.fn(),
    redirectToAuthDomain: jest.fn(),
  },
}))

jest.mock('model', () => ({
  RedirectPending: {
    push: jest.fn(),
    remove: jest.fn(),
  },
}))

jest.mock('hook/useAuth', () => ({
  ...jest.requireActual('hook/useAuth'),
  useAuth: jest.fn(),
}))

jest.mock('hook', () => ({
  ...jest.requireActual('hook'),
  useAuth: jest.requireMock('hook/useAuth').useAuth,
}))

const createWrapper = (initialEntries: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

const mockUseIsRestoring = useIsRestoring as jest.Mock

const mockUseAuth = (
  overrides: Partial<ReturnType<typeof useAuthHook.useAuth>>,
) => {
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
    ...overrides,
  })
}

describe('AuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing while the persisted cache is still restoring, without deciding auth state', () => {
    mockUseAuth({ isAuthed: false })
    mockUseIsRestoring.mockReturnValue(true)

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
      {
        wrapper: createWrapper(['/team-invite/accept?code=abc&email=a@b.com']),
      },
    )

    expect(AuthDomain.redirectToAuthDomain).not.toHaveBeenCalled()
    expect(RedirectPending.push).not.toHaveBeenCalled()
  })

  it('preserves the current deep link in returnTo when redirecting to a configured auth domain', () => {
    mockUseAuth({ isAuthed: false })
    mockUseIsRestoring.mockReturnValue(false)
    jest.spyOn(AuthDomain, 'hasAuthDomain').mockReturnValue(true)
    jest.spyOn(AuthDomain, 'onAuthDomain').mockReturnValue(false)
    jest.spyOn(AuthDomain, 'shouldBypassAuthDomain').mockReturnValue(false)

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
      {
        wrapper: createWrapper(['/team-invite/accept?code=abc&email=a@b.com']),
      },
    )

    expect(AuthDomain.redirectToAuthDomain).toHaveBeenCalledWith(
      '/team-invite/accept?code=abc&email=a@b.com',
    )
    // RedirectPending is origin-scoped and can't survive a cross-domain redirect — it
    // shouldn't be used as a (false) safety net on this branch.
    expect(RedirectPending.push).not.toHaveBeenCalled()
  })

  it('pushes the current deep link to RedirectPending and navigates to login when no auth domain is configured', () => {
    mockUseAuth({ isAuthed: false })
    mockUseIsRestoring.mockReturnValue(false)
    jest.spyOn(AuthDomain, 'hasAuthDomain').mockReturnValue(false)

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
      {
        wrapper: createWrapper(['/team-invite/accept?code=abc&email=a@b.com']),
      },
    )

    expect(RedirectPending.push).toHaveBeenCalledWith(
      'authGate',
      '/team-invite/accept?code=abc&email=a@b.com',
    )
    expect(AuthDomain.redirectToAuthDomain).not.toHaveBeenCalled()
  })

  it('renders children once restoration is complete and the user is authenticated', () => {
    mockUseAuth({
      isAuthed: true,
      auth: {
        client: { _id: 'c1' },
        user: { emailMeta: { verify: { status: { isVerified: true } } } },
      } as unknown as ReturnType<typeof useAuthHook.useAuth>['auth'],
    })
    mockUseIsRestoring.mockReturnValue(false)

    const { getByText } = render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
      {
        wrapper: createWrapper(['/team-invite/accept?code=abc&email=a@b.com']),
      },
    )

    expect(getByText('protected content')).toBeInTheDocument()
  })

  it('redirects to /verify-email when requireEmailVerified is set and the email is unverified', () => {
    mockUseAuth({
      isAuthed: true,
      auth: {
        client: { _id: 'c1' },
        user: { emailMeta: { verify: { status: { isVerified: false } } } },
      } as unknown as ReturnType<typeof useAuthHook.useAuth>['auth'],
    })
    mockUseIsRestoring.mockReturnValue(false)

    const { queryByText } = render(
      <AuthGate requireEmailVerified>
        <div>protected content</div>
      </AuthGate>,
      { wrapper: createWrapper(['/some-page']) },
    )

    expect(queryByText('protected content')).not.toBeInTheDocument()
  })
})
