import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useIsRestoring } from '@tanstack/react-query'

import { useAuthLoginRedirect } from './useAuthLoginRedirect'
import { AuthDomain, RedirectPending } from 'model'
import * as useAuthHook from './useAuth'

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useIsRestoring: jest.fn(),
}))

jest.mock('model', () => ({
  AuthDomain: {
    handleAuth: jest.fn(),
    handleAuthed: jest.fn(),
    onAuthDomain: jest.fn().mockReturnValue(false),
    consumeLoginJustSubmitted: jest.fn().mockReturnValue(false),
  },
  RedirectPending: {
    push: jest.fn(),
    remove: jest.fn(),
  },
}))

jest.mock('./useAuth', () => ({
  ...jest.requireActual('./useAuth'),
  useAuth: jest.fn(),
}))

const mockUseIsRestoring = useIsRestoring as jest.Mock

const mockUseAuth = (
  overrides: Partial<ReturnType<typeof useAuthHook.useAuth>>,
) => {
  ;(useAuthHook.useAuth as jest.Mock).mockReturnValue({
    auth: null,
    isAuthed: false,
    authRefresh: jest.fn(),
    ...overrides,
  })
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/login']}>{children}</MemoryRouter>
)

const buildMockAuth = (): NonNullable<
  ReturnType<typeof useAuthHook.useAuth>['auth']
> => ({
  client: { _id: 'c1' },
  user: {
    nameFirst: 'Jane',
    nameLast: 'Doe',
    email: 'jane@example.com',
    projectOwn: [],
    projectAdmin: [],
  },
  accessToken: {
    token: 'access-token',
    ip: '127.0.0.1',
    ttl: 3600,
    createdAt: new Date(),
    expiresAt: new Date(),
  },
  jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
})

describe('useAuthLoginRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'opener', {
      value: null,
      writable: true,
      configurable: true,
    })
  })

  it('takes no action while the persisted cache is still restoring', () => {
    mockUseAuth({ isAuthed: false })
    mockUseIsRestoring.mockReturnValue(true)

    renderHook(() => useAuthLoginRedirect({ checkRedirectPending: true }), {
      wrapper,
    })

    expect(AuthDomain.handleAuth).not.toHaveBeenCalled()
    expect(RedirectPending.remove).not.toHaveBeenCalled()
  })

  it('calls AuthDomain.handleAuth once restoration completes and the user is unauthenticated', () => {
    mockUseAuth({ isAuthed: false })
    mockUseIsRestoring.mockReturnValue(false)

    renderHook(() => useAuthLoginRedirect({ checkRedirectPending: true }), {
      wrapper,
    })

    expect(AuthDomain.handleAuth).toHaveBeenCalledTimes(1)
  })

  it('navigates to the pending redirect when checkRedirectPending finds one', () => {
    mockUseAuth({ isAuthed: true, auth: buildMockAuth() })
    mockUseIsRestoring.mockReturnValue(false)
    ;(RedirectPending.remove as jest.Mock).mockReturnValue(
      '/team-invite/accept?code=abc&email=a@b.com',
    )

    renderHook(() => useAuthLoginRedirect({ checkRedirectPending: true }), {
      wrapper,
    })

    expect(RedirectPending.remove).toHaveBeenCalledWith('authGate')
    expect(AuthDomain.handleAuthed).not.toHaveBeenCalled()
  })

  it('falls back to AuthDomain.handleAuthed when checkRedirectPending finds nothing pending', () => {
    const auth = buildMockAuth()
    mockUseAuth({ isAuthed: true, auth })
    mockUseIsRestoring.mockReturnValue(false)
    ;(RedirectPending.remove as jest.Mock).mockReturnValue(null)

    renderHook(() => useAuthLoginRedirect({ checkRedirectPending: true }), {
      wrapper,
    })

    expect(RedirectPending.remove).toHaveBeenCalledWith('authGate')
    expect(AuthDomain.handleAuthed).toHaveBeenCalledWith(
      expect.any(Function),
      auth,
    )
  })
})
