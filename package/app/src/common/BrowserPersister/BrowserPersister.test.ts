import { PersistedClient } from '@tanstack/react-query-persist-client'

import { BrowserPersister } from './BrowserPersister'

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

const buildQuery = (key: string, data: unknown = `${key}-data`) => ({
  queryKey: [key],
  queryHash: JSON.stringify([key]),
  state: { data },
})

const rememberedTrue = (
  queries: PersistedClient['clientState']['queries'],
): boolean =>
  queries.find(
    (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'rememberMe',
  )?.state?.data === true

const buildClient = (
  queries: ReturnType<typeof buildQuery>[],
): PersistedClient => ({
  timestamp: Date.now(),
  buster: '',
  clientState: {
    queries: queries as unknown as PersistedClient['clientState']['queries'],
    mutations: [],
  },
})

describe('BrowserPersister — version-aware restore filtering', () => {
  it('drops unprotected queries and keeps protected ones on a stale-version blob', async () => {
    const storage = buildFakeStorage()
    const emptyStorage = buildFakeStorage()
    storage.setItem(
      'veysur.queryCache',
      JSON.stringify({
        ...buildClient([buildQuery('auth'), buildQuery('paginationPerPage')]),
        veysurBuildVersion: 'old-sha',
      }),
    )

    const persister = new BrowserPersister(storage, emptyStorage, {
      storageType: 'local',
      storageKey: 'veysur.queryCache',
      buildVersion: 'new-sha',
      protectedQueryKeyPrefixes: ['auth'],
    })

    const restored = await persister.restoreClient()

    const keys = restored?.clientState.queries.map((q) => q.queryKey[0])
    expect(keys).toEqual(['auth'])
    expect(restored?.clientState.queries[0].state).toEqual({
      data: 'auth-data',
    })
  })

  it('keeps everything when the stamped version matches the current build version', async () => {
    const storage = buildFakeStorage()
    const emptyStorage = buildFakeStorage()
    storage.setItem(
      'veysur.queryCache',
      JSON.stringify({
        ...buildClient([buildQuery('auth'), buildQuery('paginationPerPage')]),
        veysurBuildVersion: 'same-sha',
      }),
    )

    const persister = new BrowserPersister(storage, emptyStorage, {
      storageType: 'local',
      storageKey: 'veysur.queryCache',
      buildVersion: 'same-sha',
      protectedQueryKeyPrefixes: ['auth'],
    })

    const restored = await persister.restoreClient()

    const keys = restored?.clientState.queries.map((q) => q.queryKey[0]).sort()
    expect(keys).toEqual(['auth', 'paginationPerPage'])
  })

  it('treats a blob with no veysurBuildVersion field as stale', async () => {
    const storage = buildFakeStorage()
    const emptyStorage = buildFakeStorage()
    storage.setItem(
      'veysur.queryCache',
      JSON.stringify(
        buildClient([buildQuery('auth'), buildQuery('paginationPerPage')]),
      ),
    )

    const persister = new BrowserPersister(storage, emptyStorage, {
      storageType: 'local',
      storageKey: 'veysur.queryCache',
      buildVersion: 'new-sha',
      protectedQueryKeyPrefixes: ['auth'],
    })

    const restored = await persister.restoreClient()

    const keys = restored?.clientState.queries.map((q) => q.queryKey[0])
    expect(keys).toEqual(['auth'])
  })

  it('stamps the configured buildVersion when persisting', async () => {
    const storage = buildFakeStorage()
    const emptyStorage = buildFakeStorage()
    const persister = new BrowserPersister(storage, emptyStorage, {
      storageType: 'local',
      storageKey: 'veysur.queryCache',
      buildVersion: 'new-sha',
      protectedQueryKeyPrefixes: [],
    })

    await persister.persistClient(buildClient([buildQuery('auth')]))

    const raw = storage.getItem('veysur.queryCache')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string).veysurBuildVersion).toBe('new-sha')
  })

  it('filters local and session blobs independently before merging', async () => {
    const localStorage = buildFakeStorage()
    const sessionStorage = buildFakeStorage()

    localStorage.setItem(
      'veysur.queryCache',
      JSON.stringify({
        ...buildClient([buildQuery('auth'), buildQuery('localUiPref')]),
        veysurBuildVersion: 'old-sha',
      }),
    )
    sessionStorage.setItem(
      'veysur.queryCache',
      JSON.stringify({
        ...buildClient([
          buildQuery('rememberMe'),
          buildQuery('redirectPending'),
        ]),
        veysurBuildVersion: 'old-sha',
      }),
    )

    const persister = new BrowserPersister(localStorage, sessionStorage, {
      storageType: 'local',
      storageKey: 'veysur.queryCache',
      buildVersion: 'new-sha',
      protectedQueryKeyPrefixes: ['auth', 'rememberMe'],
    })

    const restored = await persister.restoreClient()

    const keys = restored?.clientState.queries.map((q) => q.queryKey[0]).sort()
    expect(keys).toEqual(['auth', 'rememberMe'])
  })
})

describe('BrowserPersister — rememberable storage routing', () => {
  const build = (localStorage: Storage, sessionStorage: Storage) =>
    new BrowserPersister(localStorage, sessionStorage, {
      storageType: 'session',
      storageKey: 'veysur.queryCache',
      buildVersion: 'sha',
      rememberableQueryKeyPrefixes: ['auth'],
      isRemembered: rememberedTrue,
    })

  it('routes a rememberable prefix to localStorage when the session is remembered', async () => {
    const localStorage = buildFakeStorage()
    const sessionStorage = buildFakeStorage()

    await build(localStorage, sessionStorage).persistClient(
      buildClient([buildQuery('rememberMe', true), buildQuery('auth')]),
    )

    expect(
      JSON.parse(
        localStorage.getItem('veysur.queryCache') as string,
      ).clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0]),
    ).toContain('auth')
    expect(sessionStorage.getItem('veysur.queryCache')).not.toContain('"auth"')
  })

  it('routes a rememberable prefix to sessionStorage when not remembered', async () => {
    const localStorage = buildFakeStorage()
    const sessionStorage = buildFakeStorage()

    await build(localStorage, sessionStorage).persistClient(
      buildClient([buildQuery('rememberMe', false), buildQuery('auth')]),
    )

    expect(localStorage.getItem('veysur.queryCache')).toBeNull()
    expect(sessionStorage.getItem('veysur.queryCache')).toContain('"auth"')
  })

  it('keeps non-rememberable app data in sessionStorage even when remembered', async () => {
    const localStorage = buildFakeStorage()
    const sessionStorage = buildFakeStorage()

    await build(localStorage, sessionStorage).persistClient(
      buildClient([
        buildQuery('rememberMe', true),
        buildQuery('auth'),
        buildQuery('surveyList'),
      ]),
    )

    const localKeys = JSON.parse(
      localStorage.getItem('veysur.queryCache') as string,
    ).clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0])
    const sessionKeys = JSON.parse(
      sessionStorage.getItem('veysur.queryCache') as string,
    ).clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0])

    expect(localKeys).toEqual(['auth'])
    expect(sessionKeys).toEqual(['rememberMe', 'surveyList'])
  })
})

describe('BrowserPersister — per-store maxAge on restore', () => {
  const staleClient = (ageMs: number) => ({
    ...buildClient([buildQuery('auth')]),
    timestamp: Date.now() - ageMs,
    veysurBuildVersion: 'sha',
  })

  it('drops a session blob older than sessionMaxAge but keeps a fresh local blob', async () => {
    const localStorage = buildFakeStorage()
    const sessionStorage = buildFakeStorage()
    localStorage.setItem('veysur.queryCache', JSON.stringify(staleClient(0)))
    sessionStorage.setItem(
      'veysur.queryCache',
      JSON.stringify({
        ...staleClient(2 * 60 * 60 * 1000),
        clientState: {
          queries: [buildQuery('surveyList')],
          mutations: [],
        },
      }),
    )

    const persister = new BrowserPersister(localStorage, sessionStorage, {
      storageKey: 'veysur.queryCache',
      buildVersion: 'sha',
      sessionMaxAge: 60 * 60 * 1000,
      localMaxAge: Infinity,
    })

    const restored = await persister.restoreClient()

    expect(restored?.clientState.queries.map((q) => q.queryKey[0])).toEqual([
      'auth',
    ])
    expect(sessionStorage.getItem('veysur.queryCache')).toBeNull()
  })

  it('drops a local blob older than localMaxAge, forcing re-login', async () => {
    const localStorage = buildFakeStorage()
    const sessionStorage = buildFakeStorage()
    localStorage.setItem(
      'veysur.queryCache',
      JSON.stringify(staleClient(200 * 24 * 60 * 60 * 1000)),
    )

    const persister = new BrowserPersister(localStorage, sessionStorage, {
      storageKey: 'veysur.queryCache',
      buildVersion: 'sha',
      localMaxAge: 180 * 24 * 60 * 60 * 1000,
    })

    expect(await persister.restoreClient()).toBeUndefined()
    expect(localStorage.getItem('veysur.queryCache')).toBeNull()
  })
})
