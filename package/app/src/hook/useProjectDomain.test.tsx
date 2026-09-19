import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProjectDomain } from './useProjectDomain'
import * as useAuthHook from 'hook/useAuth'

// Mock useAuth hook
jest.mock('hook/useAuth', () => ({
  useAuth: jest.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useProjectDomain', () => {
  const mockUseAuth = useAuthHook.useAuth as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window.location.host
    delete (window as unknown as { location?: Location }).location
    ;(window as unknown as { location: Location }).location = {
      host: 'project.example.com',
    } as Location
  })

  it('should return null or undefined when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthed: false,
      auth: null,
    })

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeUndefined()
  })

  it('should return undefined when authenticated but user has no projects', () => {
    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
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
      },
    })

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeUndefined()
  })

  it('should find project by matching domain from projectOwn', async () => {
    const mockProject = {
      _id: 'project123',
      domain: 'project.example.com',
      subdomain: 'project',
      name: 'Test Project',
    }

    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: [mockProject],
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
      },
    })

    window.location.host = 'project.example.com'

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toEqual(mockProject)
    })
  })

  it('should find project by matching subdomain from projectOwn', async () => {
    const mockProject = {
      _id: 'project123',
      domain: 'project.example.com',
      subdomain: 'myproject',
      name: 'Test Project',
    }

    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: [mockProject],
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
      },
    })

    window.location.host = 'myproject'

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toEqual(mockProject)
    })
  })

  it('should find project by matching domain from projectAdmin', async () => {
    const mockProject = {
      _id: 'project456',
      domain: 'admin.example.com',
      subdomain: 'admin',
      name: 'Admin Project',
    }

    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'Jane',
          nameLast: 'Smith',
          email: 'jane@example.com',
          projectOwn: [],
          projectAdmin: [{ project: mockProject }],
        },
        jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
        accessToken: {
          token: 'access-token',
          ip: '127.0.0.1',
          ttl: 3600,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      },
    })

    window.location.host = 'admin.example.com'

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toEqual(mockProject)
    })
  })

  it('should prioritize projectOwn over projectAdmin when both match', async () => {
    const ownedProject = {
      _id: 'owned123',
      domain: 'shared.example.com',
      subdomain: 'shared',
      name: 'Owned Project',
    }

    const adminProject = {
      _id: 'admin456',
      domain: 'shared.example.com',
      subdomain: 'shared',
      name: 'Admin Project',
    }

    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: [ownedProject],
          projectAdmin: [adminProject],
        },
        jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
        accessToken: {
          token: 'access-token',
          ip: '127.0.0.1',
          ttl: 3600,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      },
    })

    window.location.host = 'shared.example.com'

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      // Should use the project from projectOwn (processed last, overwrites)
      expect(result.current).toEqual(ownedProject)
    })
  })

  it('should handle multiple projects and find correct match', async () => {
    const project1 = {
      _id: 'project1',
      domain: 'project1.example.com',
      subdomain: 'p1',
      name: 'Project 1',
    }

    const project2 = {
      _id: 'project2',
      domain: 'project2.example.com',
      subdomain: 'p2',
      name: 'Project 2',
    }

    const project3 = {
      _id: 'project3',
      domain: 'project3.example.com',
      subdomain: 'p3',
      name: 'Project 3',
    }

    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: [project1, project2],
          projectAdmin: [project3],
        },
        jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
        accessToken: {
          token: 'access-token',
          ip: '127.0.0.1',
          ttl: 3600,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      },
    })

    window.location.host = 'project2.example.com'

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toEqual(project2)
    })
  })

  it('should not re-resolve project if the cached project still matches auth data', async () => {
    const existingProject = {
      _id: 'existing123',
      domain: 'existing.example.com',
      subdomain: 'existing',
      name: 'Existing Project',
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    // Pre-populate the cache with the same project auth data resolves to
    queryClient.setQueryData(['projectDomain'], existingProject)

    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: [existingProject],
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
      },
    })

    window.location.host = 'existing.example.com'

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    expect(result.current).toEqual(existingProject)
  })

  it('should discard a stale cached project that no longer matches auth data', async () => {
    const staleProject = {
      _id: 'stale-id-from-before-reseed',
      domain: 'existing.example.com',
      subdomain: 'existing',
      name: 'Stale Project',
    }

    const currentProject = {
      _id: 'current123',
      domain: 'existing.example.com',
      subdomain: 'existing',
      name: 'Current Project',
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    // Cache holds an id that no longer exists in the current auth data —
    // e.g. left over from before a dev environment reseed.
    queryClient.setQueryData(['projectDomain'], staleProject)

    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: [currentProject],
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
      },
    })

    window.location.host = 'existing.example.com'

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    await waitFor(() => {
      expect(result.current).toEqual(currentProject)
    })
  })

  it('should handle null auth user gracefully', () => {
    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: null,
        jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
        accessToken: {
          token: 'access-token',
          ip: '127.0.0.1',
          ttl: 3600,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      },
    })

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeUndefined()
  })

  it('should handle undefined projectOwn and projectAdmin arrays', async () => {
    mockUseAuth.mockReturnValue({
      isAuthed: true,
      auth: {
        client: { _id: 'client123' },
        user: {
          nameFirst: 'John',
          nameLast: 'Doe',
          email: 'john@example.com',
          projectOwn: undefined,
          projectAdmin: undefined,
        },
        jwt: { token: 'jwt-token', created: new Date(), expires: new Date() },
        accessToken: {
          token: 'access-token',
          ip: '127.0.0.1',
          ttl: 3600,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      },
    })

    const { result } = renderHook(() => useProjectDomain(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeUndefined()
  })
})
