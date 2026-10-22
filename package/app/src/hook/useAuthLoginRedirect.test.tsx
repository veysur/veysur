import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useIsRestoring } from '@tanstack/react-query'

import {
  resetAuthReloadThrottle,
  useAuthLoginRedirect,
} from './useAuthLoginRedirect'
import { AuthDomain, RedirectPending } from 'model'
import * as useAuthHook from './useAuth'
import { allowConsole } from '../../tests/consoleGuard'

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
  describe('already-logged-in refresh on the auth domain', () => {
    const setup = (authRefresh: jest.Mock) => {
      window.history.pushState(
        {},
        '',
        '/login?returnTo=https://p.example.com/admin',
      )
      mockUseAuth({ isAuthed: true, auth: buildMockAuth(), authRefresh })
      mockUseIsRestoring.mockReturnValue(false)
      ;(AuthDomain.onAuthDomain as jest.Mock).mockReturnValue(true)
      return renderHook(() => useAuthLoginRedirect(), { wrapper })
    }

    beforeEach(() => resetAuthReloadThrottle())

    afterEach(() => {
      window.history.pushState({}, '', '/')
      ;(AuthDomain.onAuthDomain as jest.Mock).mockReturnValue(false)
    })

    it('force-refreshes auth once and reports it until done', async () => {
      const authRefresh = jest.fn().mockResolvedValue(undefined)
      const { result } = setup(authRefresh)

      expect(result.current.isRefreshingAuth).toBe(true)
      await waitFor(() => expect(result.current.isRefreshingAuth).toBe(false))
      expect(authRefresh).toHaveBeenCalledTimes(1)
      expect(authRefresh).toHaveBeenCalledWith(true)
    })

    it('does not force-refresh again on a remount shortly afterwards', async () => {
      const authRefresh = jest.fn().mockResolvedValue(undefined)
      const first = setup(authRefresh)
      await waitFor(() =>
        expect(first.result.current.isRefreshingAuth).toBe(false),
      )
      first.unmount()

      const second = setup(authRefresh)
      await waitFor(() =>
        expect(second.result.current.isRefreshingAuth).toBe(false),
      )
      expect(authRefresh).toHaveBeenCalledTimes(1)
    })

    it('stops reporting a refresh when the refresh fails', async () => {
      const authRefresh = jest.fn().mockRejectedValue(new Error('boom'))
      const { result } = setup(authRefresh)

      await allowConsole(/Auth refresh failed/, () =>
        waitFor(() => expect(result.current.isRefreshingAuth).toBe(false)),
      )
    })

    it('skips the refresh straight after a login submit', async () => {
      ;(AuthDomain.consumeLoginJustSubmitted as jest.Mock).mockReturnValueOnce(
        true,
      )
      const authRefresh = jest.fn().mockResolvedValue(undefined)
      const { result } = setup(authRefresh)
      await waitFor(() => expect(result.current.isRefreshingAuth).toBe(false))

      expect(authRefresh).not.toHaveBeenCalledWith(true)
    })
  })
})
