import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { AxiosError } from 'axios'

import {
  KEY_STATE_AUTH,
  KEY_STATE_SURVEY_AUTH,
  KEY_STATE_COOKIE_CONSENT,
  KEY_STATE_REMEMBER_ME,
} from 'common/keyState'

import { BrowserPersister } from './BrowserPersister'
import { browserPersister, queryClient } from './queryClient'

/**
 * Regression test for the cold-tab auth race: a query with a near-instant queryFn (like
 * useAuth's `queryFn: async () => null`) must not be allowed to resolve — and thereby
 * permanently discard a real, older-timestamped persisted session — before the persisted
 * cache has finished restoring. `enabled: false` while restoring (the pattern used by
 * `hook/useAuth.ts` — shared by appAdmin and every other sub-app — via `useIsRestoring()`)
 * is what prevents this; a bare `enabled: true` query reproduces data loss.
 */
describe('cold-tab persisted-query restore race', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  const buildFakeStorage = (): Storage => {
    const store = new Map<string, string>()
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage
  }

  const seedPersistedAuth = (storage: Storage, key: string) => {
    const priorClient = new QueryClient()
    priorClient.setQueryData(['auth'], { user: { email: 'real@user.com' } })
    const persistedState = {
      timestamp: Date.now() - 5000,
      buster: '',
      clientState: {
        queries: [
          {
            queryKey: ['auth'],
            queryHash: JSON.stringify(['auth']),
            state: priorClient.getQueryState(['auth']),
          },
        ],
        mutations: [],
      },
      // Stamp matches BrowserPersister's default buildVersion ('dev') — this test exercises
      // the restore race, not version-aware filtering, so the blob must not read as stale.
      veysurBuildVersion: 'dev',
    }
    storage.setItem(key, JSON.stringify(persistedState))
  }

  it('loses a persisted session when the live query is enabled during restore (documents the bug)', async () => {
    const storage = buildFakeStorage()
    seedPersistedAuth(storage, 'veysur.queryCache')

    const queryClient = new QueryClient({ defaultOptions: { queries: {} } })
    const persister = new BrowserPersister(storage, storage, {
      enabled: true,
      storageType: 'session',
      storageKey: 'veysur.queryCache',
    })
    persistQueryClient({ queryClient, persister })

    const observer = queryClient.getQueryCache().build(queryClient, {
      queryKey: ['auth'],
      queryFn: async () => null,
    })
    await observer.fetch()
    await new Promise((r) => setTimeout(r, 20))

    expect(queryClient.getQueryData(['auth'])).toBeNull()
  })

  it('preserves a persisted session when the live query is disabled during restore (fixed behavior)', async () => {
    const storage = buildFakeStorage()
    seedPersistedAuth(storage, 'veysur.queryCache')

    const queryClient = new QueryClient({ defaultOptions: { queries: {} } })
    const persister = new BrowserPersister(storage, storage, {
      enabled: true,
      storageType: 'session',
      storageKey: 'veysur.queryCache',
    })
    persistQueryClient({ queryClient, persister })

    // Building the query without calling .fetch() mirrors `enabled: !isRestoring` at the very
    // start of restoration — the query never fetches, so restoration is free to hydrate the
    // real data.
    queryClient.getQueryCache().build(queryClient, {
      queryKey: ['auth'],
      queryFn: async () => null,
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(queryClient.getQueryData(['auth'])).toEqual({
      user: { email: 'real@user.com' },
    })
  })
})

describe('browserPersister protected query keys', () => {
  const CACHE_KEY = 'veysur.queryCache'

  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('keeps auth, survey auth, cookie consent, and rememberMe through a version mismatch', async () => {
    const buildQuery = (key: string) => ({
      queryKey: [key],
      queryHash: JSON.stringify([key]),
      state: { data: `${key}-data` },
    })

    const staleBlob = {
      timestamp: Date.now(),
      buster: '',
      clientState: {
        queries: [
          buildQuery(KEY_STATE_AUTH),
          buildQuery(KEY_STATE_SURVEY_AUTH),
          buildQuery(KEY_STATE_COOKIE_CONSENT),
          buildQuery(KEY_STATE_REMEMBER_ME),
          buildQuery('paginationPerPage'),
        ],
        mutations: [],
      },
      veysurBuildVersion: 'a-previous-deploy-sha',
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(staleBlob))

    const restored = await browserPersister.restoreClient()
    const keys = restored?.clientState.queries.map((q) => q.queryKey[0])

    expect(keys).toEqual(
      expect.arrayContaining([
        KEY_STATE_AUTH,
        KEY_STATE_SURVEY_AUTH,
        KEY_STATE_COOKIE_CONSENT,
        KEY_STATE_REMEMBER_ME,
      ]),
    )
    expect(keys).not.toContain('paginationPerPage')
  })

  it('routes auth to localStorage but generic app data to sessionStorage when remembered', async () => {
    const buildQuery = (key: string, data: unknown = `${key}-data`) => ({
      queryKey: [key],
      queryHash: JSON.stringify([key]),
      state: { data },
    })

    await browserPersister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: {
        queries: [
          buildQuery(KEY_STATE_REMEMBER_ME, true),
          buildQuery(KEY_STATE_AUTH),
          buildQuery('surveyList'),
        ],
        mutations: [],
      },
    } as unknown as Parameters<typeof browserPersister.persistClient>[0])

    const localKeys = JSON.parse(
      window.localStorage.getItem(CACHE_KEY) as string,
    ).clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0])
    const sessionKeys = JSON.parse(
      window.sessionStorage.getItem(CACHE_KEY) as string,
    ).clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0])

    expect(localKeys).toContain(KEY_STATE_AUTH)
    expect(localKeys).not.toContain('surveyList')
    expect(sessionKeys).toEqual(
      expect.arrayContaining([KEY_STATE_REMEMBER_ME, 'surveyList']),
    )
    expect(sessionKeys).not.toContain(KEY_STATE_AUTH)
  })
})

describe('queryClient default retry predicate', () => {
  const buildAxiosError = (status: number): AxiosError =>
    Object.assign(new AxiosError('Request failed'), {
      response: { status, data: {}, statusText: '', headers: {}, config: {} },
    })

  it('does not retry 4xx responses', () => {
    const { retry } = queryClient.getDefaultOptions().queries ?? {}
    const retryFn = retry as (failureCount: number, error: unknown) => boolean

    expect(retryFn(0, buildAxiosError(404))).toBe(false)
    expect(retryFn(0, buildAxiosError(429))).toBe(false)
  })

  it('retries non-4xx errors exactly once', () => {
    const { retry } = queryClient.getDefaultOptions().queries ?? {}
    const retryFn = retry as (failureCount: number, error: unknown) => boolean

    const networkError = new Error('Network Error')
    expect(retryFn(0, networkError)).toBe(true)
    expect(retryFn(1, networkError)).toBe(false)

    expect(retryFn(0, buildAxiosError(500))).toBe(true)
    expect(retryFn(1, buildAxiosError(500))).toBe(false)
  })
})
