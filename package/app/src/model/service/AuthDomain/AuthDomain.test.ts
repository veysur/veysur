import { AuthData } from 'hook'
import { Registry, KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER } from 'common'

import { AuthDomain } from './AuthDomain'

describe('AuthDomain', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    AuthDomain.browserInterface = {
      getLocation: jest.fn().mockReturnValue({
        protocol: 'https:',
        origin: 'https://example.com',
        host: 'example.com',
        search: '',
      }),
      setLocation: jest.fn(),
      openWindow: jest.fn(),
      closeWindow: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('https:'),
      getOrigin: jest.fn().mockReturnValue('https://example.com'),
      getHost: jest.fn().mockReturnValue('example.com'),
      getReferrer: jest.fn().mockReturnValue(''),
      reloadPage: jest.fn(),
    }
    // Reset services to pick up the mocked browserInterface
    AuthDomain.resetServices()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('hasAuthDomain', () => {
    it('returns true when PUBLIC_AUTHENTICATION_DOMAIN is set', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      expect(AuthDomain.hasAuthDomain()).toBe(true)
    })

    it('returns false when PUBLIC_AUTHENTICATION_DOMAIN is not set', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      expect(AuthDomain.hasAuthDomain()).toBe(false)
    })
  })

  describe('getAuthDomain', () => {
    it('returns PUBLIC_AUTHENTICATION_DOMAIN when set', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      expect(AuthDomain.getAuthDomain()).toBe('auth.example.com')
    })

    it('returns current host when PUBLIC_AUTHENTICATION_DOMAIN is not set', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      expect(AuthDomain.getAuthDomain()).toBe('example.com')
    })
  })

  describe('onAuthDomain', () => {
    it('returns true when current host matches auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'example.com'
      expect(AuthDomain.onAuthDomain()).toBe(true)
    })

    it('returns false when current host does not match auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      expect(AuthDomain.onAuthDomain()).toBe(false)
    })
  })

  describe('getAuthLoginPath', () => {
    it('returns PUBLIC_AUTHENTICATION_LOGIN_PATH when set', () => {
      process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH = '/custom/login'
      expect(AuthDomain.getAuthLoginPath()).toBe('/custom/login')
    })

    it('returns /login when PUBLIC_AUTHENTICATION_LOGIN_PATH is not set', () => {
      process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH = ''
      expect(AuthDomain.getAuthLoginPath()).toBe('/login')
    })
  })

  describe('getAuthLogoutPath', () => {
    it('returns PUBLIC_AUTHENTICATION_LOGOUT_PATH when set', () => {
      process.env.PUBLIC_AUTHENTICATION_LOGOUT_PATH = '/custom/logout'
      expect(AuthDomain.getAuthLogoutPath()).toBe('/custom/logout')
    })

    it('returns /logout when PUBLIC_AUTHENTICATION_LOGOUT_PATH is not set', () => {
      process.env.PUBLIC_AUTHENTICATION_LOGOUT_PATH = ''
      expect(AuthDomain.getAuthLogoutPath()).toBe('/logout')
    })
  })

  describe('getAccountUrl', () => {
    it('returns the account app base URL with no path argument', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'account.example.com'
      process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH = '/'
      expect(AuthDomain.getAccountUrl()).toBe('https://account.example.com/')
    })

    it('appends a path after the configured home path', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'account.example.com'
      process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH = '/'
      expect(AuthDomain.getAccountUrl('password-reset')).toBe(
        'https://account.example.com/password-reset',
      )
    })

    it('respects a self-hosted single-domain home path when appending a path', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH = '/account/'
      expect(AuthDomain.getAccountUrl('password-reset')).toBe(
        'https://example.com/account/password-reset',
      )
    })

    it('normalises the trailing slash of an explicit home path, as the build bakes it', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH = '/account'
      expect(AuthDomain.getAccountUrl()).toBe('https://example.com/account/')
      expect(AuthDomain.getAccountUrl('password-reset')).toBe(
        'https://example.com/account/password-reset',
      )
    })

    it('falls back to PUBLIC_BASE_ACCOUNT (trailing-slash-normalised) when no explicit home path is set', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      delete process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH
      process.env.PUBLIC_BASE_ACCOUNT = '/account'
      expect(AuthDomain.getAccountUrl()).toBe('https://example.com/account/')
      expect(AuthDomain.getAccountUrl('password-reset')).toBe(
        'https://example.com/account/password-reset',
      )
    })

    it('defaults to a bare / when neither the home path nor PUBLIC_BASE_ACCOUNT is set', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      delete process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH
      delete process.env.PUBLIC_BASE_ACCOUNT
      expect(AuthDomain.getAccountUrl()).toBe('https://example.com/')
    })
  })

  describe('getPlatformUrl', () => {
    it('appends a path after the platform subdomain root', () => {
      process.env.PUBLIC_APP_DOMAIN = 'veysur.test'
      expect(AuthDomain.getPlatformUrl('support-ticket/1')).toBe(
        'https://platform.veysur.test/support-ticket/1',
      )
    })
  })

  describe('getAdminUrl', () => {
    it('builds an admin project URL for a given host with no path', () => {
      process.env.PUBLIC_BASE_ADMIN = '/admin'
      expect(AuthDomain.getAdminUrl('project-1.veysur.test')).toBe(
        'https://project-1.veysur.test/admin',
      )
    })

    it('does not repeat the port when the host already carries one', () => {
      process.env.PUBLIC_BASE_ADMIN = '/admin'
      AuthDomain.browserInterface.getLocation = jest.fn().mockReturnValue({
        protocol: 'http:',
        origin: 'http://localhost:8080',
        host: 'localhost:8080',
        port: '8080',
        search: '',
      })
      AuthDomain.resetServices()
      expect(AuthDomain.getAdminUrl('localhost:8080', '/team')).toBe(
        'http://localhost:8080/admin/team',
      )
    })

    it('adds the current port to a host that has none', () => {
      process.env.PUBLIC_BASE_ADMIN = '/admin'
      AuthDomain.browserInterface.getLocation = jest.fn().mockReturnValue({
        protocol: 'http:',
        origin: 'http://project-1.veysur.local:8080',
        host: 'project-1.veysur.local:8080',
        port: '8080',
        search: '',
      })
      AuthDomain.resetServices()
      expect(AuthDomain.getAdminUrl('project-1.veysur.local')).toBe(
        'http://project-1.veysur.local:8080/admin',
      )
    })

    it('appends a path after the admin base path', () => {
      process.env.PUBLIC_BASE_ADMIN = '/admin'
      expect(AuthDomain.getAdminUrl('project-1.veysur.test', '/login')).toBe(
        'https://project-1.veysur.test/admin/login',
      )
    })
  })

  describe('redirectToAuthDomain', () => {
    it('redirects to the auth domain with correct parameters using default login path', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH = ''
      AuthDomain.redirectToAuthDomain()
      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        'https://auth.example.com/login?returnTo=https%3A%2F%2Fexample.com' +
          encodeURIComponent(AuthDomain.getAuthHomePath()),
      )
    })

    it('redirects to the auth domain with custom login path', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH = '/admin/login'
      AuthDomain.redirectToAuthDomain()
      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        'https://auth.example.com/admin/login?returnTo=https%3A%2F%2Fexample.com' +
          encodeURIComponent(AuthDomain.getAuthHomePath()),
      )
    })

    it('preserves a deep-link path in returnTo instead of the fixed auth home path', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH = ''
      AuthDomain.redirectToAuthDomain(
        '/team-invite/accept?code=abc&email=a@b.com',
      )
      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        'https://auth.example.com/login?returnTo=' +
          encodeURIComponent(
            'https://example.com/team-invite/accept?code=abc&email=a@b.com',
          ),
      )
    })
  })

  describe('prepareTargetWindow', () => {
    beforeEach(() => {
      AuthDomain.browserInterface.openWindow = jest.fn().mockReturnValue({
        closed: false,
        document: document.implementation.createHTMLDocument(),
        location: { href: '' },
      })
    })

    it('opens a popup on the auth domain even with no returnTo param', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'example.com'
      AuthDomain.browserInterface.getLocation = jest.fn().mockReturnValue({
        protocol: 'https:',
        origin: 'https://example.com',
        host: 'example.com',
        search: '',
      })
      AuthDomain.resetServices()

      const result = AuthDomain.prepareTargetWindow()

      expect(AuthDomain.browserInterface.openWindow).toHaveBeenCalled()
      expect(result).not.toBeNull()
    })

    it('opens a popup on the auth domain with a returnTo param (existing flow)', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'example.com'
      AuthDomain.browserInterface.getLocation = jest.fn().mockReturnValue({
        protocol: 'https:',
        origin: 'https://example.com',
        host: 'example.com',
        search: '?returnTo=https://app.example.com',
      })
      AuthDomain.resetServices()

      const result = AuthDomain.prepareTargetWindow()

      expect(AuthDomain.browserInterface.openWindow).toHaveBeenCalled()
      expect(result).not.toBeNull()
    })

    it('returns null when there is no separate auth domain (self-hosted)', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      AuthDomain.resetServices()

      const result = AuthDomain.prepareTargetWindow()

      expect(AuthDomain.browserInterface.openWindow).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('returns null when not on the auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('project.example.com')
      AuthDomain.resetServices()

      const result = AuthDomain.prepareTargetWindow()

      expect(AuthDomain.browserInterface.openWindow).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('handleAuthed', () => {
    it('calls openTargetAndPostAuthData when conditions are met', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      AuthDomain.browserInterface.getLocation = jest.fn().mockReturnValue({
        protocol: 'https:',
        origin: 'https://auth.example.com',
        host: 'auth.example.com',
        search: '?returnTo=https://app.example.com',
      })
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('auth.example.com')
      AuthDomain.resetServices()

      const navigateMock = jest.fn()
      const openTargetAndPostAuthDataSpy = jest
        .spyOn(AuthDomain, 'openTargetAndPostAuthData')
        .mockImplementation()

      AuthDomain.handleAuthed(navigateMock, {
        client: {
          _id: 'test-client-id',
        },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: [],
          projectAdmin: [],
        },
        accessToken: {
          token: 'test-token',
          ip: '127.0.0.1',
          ttl: 3600,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        jwt: {
          token: 'test-jwt',
          created: new Date(),
          expires: new Date(),
        },
      })

      expect(openTargetAndPostAuthDataSpy).toHaveBeenCalledWith(
        'https://app.example.com',
        {
          client: {
            _id: 'test-client-id',
          },
          user: {
            nameFirst: 'John',
            nameLast: 'Doe',
            email: 'john@example.com',
            projectOwn: [],
            projectAdmin: [],
          },
          accessToken: {
            token: 'test-token',
            ip: '127.0.0.1',
            ttl: 3600,
            createdAt: expect.any(Date),
            expiresAt: expect.any(Date),
          },
          jwt: {
            token: 'test-jwt',
            created: expect.any(Date),
            expires: expect.any(Date),
          },
        },
      )
      expect(navigateMock).not.toHaveBeenCalled()
      openTargetAndPostAuthDataSpy.mockRestore()
    })

    it('redirects straight to the admin app (self-hosted default single-project resolver) when on auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      process.env.PUBLIC_BASE_ADMIN = '/admin'
      const navigateMock = jest.fn()
      const openTargetAndPostAuthDataSpy = jest
        .spyOn(AuthDomain, 'openTargetAndPostAuthData')
        .mockImplementation()

      AuthDomain.handleAuthed(navigateMock)

      expect(openTargetAndPostAuthDataSpy).toHaveBeenCalledWith(
        'https://example.com/admin',
        undefined,
      )
      expect(AuthDomain.browserInterface.setLocation).not.toHaveBeenCalled()
      expect(navigateMock).not.toHaveBeenCalled()
      openTargetAndPostAuthDataSpy.mockRestore()
    })

    it('hard-navigates to the account URL and closes the speculative popup when a registered resolver declines to redirect', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'example.com'
      const navigateMock = jest.fn()
      const closeTargetWindowSpy = jest.spyOn(AuthDomain, 'closeTargetWindow')
      const registry = Registry.getInstance()
      registry.set(KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER, {
        resolve: () => null,
      })

      AuthDomain.handleAuthed(navigateMock)

      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        AuthDomain.getAccountUrl(),
      )
      expect(closeTargetWindowSpy).toHaveBeenCalled()
      expect(navigateMock).not.toHaveBeenCalled()
      registry.set(KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER, undefined)
    })

    it('redirects to a registered resolver target (cloud multi-project user with exactly one project) instead of the account URL', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'example.com'
      const navigateMock = jest.fn()
      const openTargetAndPostAuthDataSpy = jest
        .spyOn(AuthDomain, 'openTargetAndPostAuthData')
        .mockImplementation()
      const registry = Registry.getInstance()
      registry.set(KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER, {
        resolve: () => 'https://project-1.example.com/admin',
      })

      const authData = {
        user: { projectOwn: [], projectAdmin: [] },
      } as unknown as AuthData
      AuthDomain.handleAuthed(navigateMock, authData)

      expect(openTargetAndPostAuthDataSpy).toHaveBeenCalledWith(
        'https://project-1.example.com/admin',
        authData,
      )
      expect(AuthDomain.browserInterface.setLocation).not.toHaveBeenCalled()
      openTargetAndPostAuthDataSpy.mockRestore()
      registry.set(KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER, undefined)
    })

    it('calls navigate with project home path when not on auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      AuthDomain.browserInterface.getHost = () => 'project.example.com'
      AuthDomain.resetServices()
      const navigateMock = jest.fn()

      AuthDomain.handleAuthed(navigateMock)

      expect(navigateMock).toHaveBeenCalledWith(AuthDomain.getAuthHomePath())
    })
  })

  describe('getBypassDomains', () => {
    it('returns empty array when env var is not set', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = ''
      expect(AuthDomain.getBypassDomains()).toEqual([])
    })

    it('returns empty array when env var is whitespace', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = '   '
      expect(AuthDomain.getBypassDomains()).toEqual([])
    })

    it('returns array of domains when env var is set', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = 'localhost,127.0.0.1'
      expect(AuthDomain.getBypassDomains()).toEqual(['localhost', '127.0.0.1'])
    })

    it('trims whitespace from domain names', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS =
        ' localhost , 127.0.0.1 , test.local '
      expect(AuthDomain.getBypassDomains()).toEqual([
        'localhost',
        '127.0.0.1',
        'test.local',
      ])
    })

    it('filters out empty strings', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = 'localhost,,127.0.0.1'
      expect(AuthDomain.getBypassDomains()).toEqual(['localhost', '127.0.0.1'])
    })
  })

  describe('shouldBypassAuthDomain', () => {
    it('returns false when bypass domains list is empty', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = ''
      expect(AuthDomain.shouldBypassAuthDomain()).toBe(false)
    })

    it('returns true when current host is in bypass list', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = 'localhost,example.com'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('localhost')
      AuthDomain.resetServices()
      expect(AuthDomain.shouldBypassAuthDomain()).toBe(true)
    })

    it('returns false when current host is not in bypass list', () => {
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = 'localhost,127.0.0.1'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('example.com')
      AuthDomain.resetServices()
      expect(AuthDomain.shouldBypassAuthDomain()).toBe(false)
    })
  })

  describe('handleAuth', () => {
    it('does not call redirectToAuthDomain when referrer includes auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = ''
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('example.com')
      AuthDomain.browserInterface.getReferrer = jest
        .fn()
        .mockReturnValue('https://auth.example.com')
      AuthDomain.resetServices()
      const redirectToAuthDomainSpy = jest
        .spyOn(AuthDomain, 'redirectToAuthDomain')
        .mockImplementation()

      AuthDomain.handleAuth()

      expect(redirectToAuthDomainSpy).not.toHaveBeenCalled()
      redirectToAuthDomainSpy.mockRestore()
    })

    it('calls redirectToAuthDomain when not on auth domain and referrer does not include auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = ''
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('example.com')
      AuthDomain.browserInterface.getReferrer = jest.fn().mockReturnValue('')
      AuthDomain.resetServices()
      const redirectToAuthDomainSpy = jest
        .spyOn(AuthDomain, 'redirectToAuthDomain')
        .mockImplementation()

      AuthDomain.handleAuth()

      expect(redirectToAuthDomainSpy).toHaveBeenCalled()
      redirectToAuthDomainSpy.mockRestore()
    })

    it('does not call redirectToAuthDomain when current host is in bypass list', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = 'localhost,example.com'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('localhost')
      AuthDomain.browserInterface.getReferrer = jest.fn().mockReturnValue('')
      AuthDomain.resetServices()
      const redirectToAuthDomainSpy = jest
        .spyOn(AuthDomain, 'redirectToAuthDomain')
        .mockImplementation()

      AuthDomain.handleAuth()

      expect(redirectToAuthDomainSpy).not.toHaveBeenCalled()
      redirectToAuthDomainSpy.mockRestore()
    })

    it('calls redirectToAuthDomain when not on bypass list and other conditions met', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS = 'localhost,127.0.0.1'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('app.example.com')
      AuthDomain.browserInterface.getReferrer = jest.fn().mockReturnValue('')
      AuthDomain.resetServices()
      const redirectToAuthDomainSpy = jest
        .spyOn(AuthDomain, 'redirectToAuthDomain')
        .mockImplementation()

      AuthDomain.handleAuth()

      expect(redirectToAuthDomainSpy).toHaveBeenCalled()
      redirectToAuthDomainSpy.mockRestore()
    })
  })

  describe('handleLogout', () => {
    it('redirects to logout page on auth domain when not on auth domain using default logout path', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_LOGOUT_PATH = ''
      AuthDomain.handleLogout()
      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        'https://auth.example.com/logout?returnTo=https%3A%2F%2Fexample.com%2Fadmin',
      )
    })

    it('redirects to logout page on auth domain with custom logout path', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'auth.example.com'
      process.env.PUBLIC_AUTHENTICATION_LOGOUT_PATH = '/admin/logout'
      AuthDomain.handleLogout()
      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        'https://auth.example.com/admin/logout?returnTo=https%3A%2F%2Fexample.com%2Fadmin',
      )
    })

    it('does not redirect when on auth domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'example.com'
      AuthDomain.handleLogout()
      expect(AuthDomain.browserInterface.setLocation).not.toHaveBeenCalled()
    })
  })

  describe('openTargetAndPostAuthData', () => {
    const authData = {
      user: {
        nameFirst: 'John',
        nameLast: 'Doe',
        email: 'john@example.com',
        projectOwn: [{ subdomain: 'myproject.example.com' }],
        projectAdmin: [],
      },
    } as unknown as AuthData

    const createMockPopup = () => ({
      closed: false,
      document: document.implementation.createHTMLDocument(),
      location: { href: '' },
    })

    beforeEach(() => {
      AuthDomain.browserInterface.openWindow = jest
        .fn()
        .mockReturnValue(createMockPopup())
    })

    it('transfers auth from the auth domain to one of the user authorized domains', () => {
      jest.useFakeTimers()
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'example.com'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('example.com')
      AuthDomain.resetServices()
      const targetWindow = createMockPopup() as unknown as Window
      AuthDomain.targetWindow = targetWindow

      AuthDomain.openTargetAndPostAuthData(
        'https://myproject.example.com/admin',
        authData,
      )

      expect(targetWindow.location.href).toEqual(
        'https://myproject.example.com/admin',
      )
      jest.useRealTimers()
    })

    it('transfers auth from a project domain to the account domain', () => {
      jest.useFakeTimers()
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'account.example.com'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('myproject.example.com')
      AuthDomain.resetServices()
      const targetWindow = createMockPopup() as unknown as Window
      AuthDomain.targetWindow = targetWindow

      AuthDomain.openTargetAndPostAuthData(
        'https://account.example.com/',
        authData,
      )

      expect(targetWindow.location.href).toEqual('https://account.example.com/')
      jest.useRealTimers()
    })

    it('does not transfer from a project domain to an unrelated, non-account domain', () => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'account.example.com'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('myproject.example.com')
      AuthDomain.resetServices()
      const targetWindow = createMockPopup() as unknown as Window
      AuthDomain.targetWindow = targetWindow
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      AuthDomain.openTargetAndPostAuthData(
        'https://otherproject.example.com/admin',
        authData,
      )

      expect(targetWindow.location.href).toEqual('')
      consoleWarnSpy.mockRestore()
    })
  })

  describe('openAccountWithAuth', () => {
    beforeEach(() => {
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = 'account.example.com'
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('myproject.example.com')
      AuthDomain.browserInterface.openWindow = jest.fn().mockReturnValue({
        closed: false,
        document: document.implementation.createHTMLDocument(),
        location: { href: '' },
      })
      AuthDomain.resetServices()
    })

    it('refreshes auth and transfers it to the account domain', async () => {
      const authData = {
        user: { projectOwn: [], projectAdmin: [] },
      } as unknown as AuthData
      const refreshedAuth = {
        user: { projectOwn: [], projectAdmin: [] },
      } as unknown as AuthData
      const authRefresh = jest.fn().mockResolvedValue(refreshedAuth)
      const openTargetSpy = jest
        .spyOn(AuthDomain, 'openTargetAndPostAuthData')
        .mockImplementation()

      await AuthDomain.openAccountWithAuth(authData, authRefresh)

      expect(authRefresh).toHaveBeenCalled()
      expect(openTargetSpy).toHaveBeenCalledWith(
        'https://account.example.com/',
        refreshedAuth,
        expect.any(Function),
      )
      openTargetSpy.mockRestore()
    })

    it('does nothing if the popup window could not be opened', async () => {
      AuthDomain.browserInterface.openWindow = jest.fn().mockReturnValue(null)
      AuthDomain.resetServices()
      const authRefresh = jest.fn().mockResolvedValue(undefined)
      const openTargetSpy = jest
        .spyOn(AuthDomain, 'openTargetAndPostAuthData')
        .mockImplementation()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      await AuthDomain.openAccountWithAuth(null, authRefresh)
      consoleErrorSpy.mockRestore()

      expect(openTargetSpy).not.toHaveBeenCalled()
      openTargetSpy.mockRestore()
    })

    it('ignores a second call while a transfer is already in progress', async () => {
      const authData = {
        user: { projectOwn: [], projectAdmin: [] },
      } as unknown as AuthData
      let resolveRefresh: (value: AuthData | undefined) => void = () => {}
      const authRefresh = jest.fn(
        () =>
          new Promise<AuthData | undefined>((resolve) => {
            resolveRefresh = resolve
          }),
      )
      const openTargetSpy = jest
        .spyOn(AuthDomain, 'openTargetAndPostAuthData')
        .mockImplementation()
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const firstCall = AuthDomain.openAccountWithAuth(authData, authRefresh)
      // Second click while the first transfer's authRefresh is still pending
      await AuthDomain.openAccountWithAuth(authData, authRefresh)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Auth transfer already in progress; ignoring duplicate request',
      )
      expect(openTargetSpy).not.toHaveBeenCalled()

      resolveRefresh(authData)
      await firstCall

      expect(openTargetSpy).toHaveBeenCalledTimes(1)

      consoleWarnSpy.mockRestore()
      openTargetSpy.mockRestore()
    })
  })

  describe('same-origin target (single-origin edition)', () => {
    const authData = {
      user: { projectOwn: [], projectAdmin: [] },
    } as unknown as AuthData

    beforeEach(() => {
      AuthDomain.browserInterface.getOrigin = jest
        .fn()
        .mockReturnValue('https://app.example.com')
      AuthDomain.browserInterface.getHost = jest
        .fn()
        .mockReturnValue('app.example.com')
      process.env.PUBLIC_AUTHENTICATION_DOMAIN = ''
      AuthDomain.resetServices()
    })

    it('openTargetAndPostAuthData navigates in place without a popup', () => {
      const openWindowSpy = jest.spyOn(
        AuthDomain.browserInterface,
        'openWindow',
      )
      const onSettled = jest.fn()

      AuthDomain.openTargetAndPostAuthData(
        'https://app.example.com/admin',
        authData,
        onSettled,
      )

      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        'https://app.example.com/admin',
      )
      expect(openWindowSpy).not.toHaveBeenCalled()
      expect(onSettled).toHaveBeenCalled()
    })

    it('openProjectWithAuth navigates in place without opening a popup or refreshing', async () => {
      const authRefresh = jest.fn().mockResolvedValue(undefined)
      const openWindowSpy = jest.spyOn(
        AuthDomain.browserInterface,
        'openWindow',
      )

      await AuthDomain.openProjectWithAuth(
        'https://app.example.com/admin',
        authData,
        authRefresh,
      )

      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalledWith(
        'https://app.example.com/admin',
      )
      expect(authRefresh).not.toHaveBeenCalled()
      expect(openWindowSpy).not.toHaveBeenCalled()
    })

    it('openAccountWithAuth navigates in place when the account URL is same-origin', async () => {
      // Auth domain unset → getAccountUrl() resolves to the current origin.
      const authRefresh = jest.fn().mockResolvedValue(undefined)

      await AuthDomain.openAccountWithAuth(authData, authRefresh)

      expect(authRefresh).not.toHaveBeenCalled()
      expect(AuthDomain.browserInterface.setLocation).toHaveBeenCalled()
    })
  })

  describe('getHostFromUrl', () => {
    it('returns the host from a valid URL', () => {
      expect(AuthDomain.getHostFromUrl('https://example.com/path')).toBe(
        'example.com',
      )
    })

    it('returns null for an invalid URL', () => {
      expect(AuthDomain.getHostFromUrl('invalid-url')).toBeNull()
    })
  })
})
