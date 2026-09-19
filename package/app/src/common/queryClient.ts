import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import {
  KEY_STATE_AUTH,
  KEY_STATE_SURVEY_AUTH,
  KEY_STATE_COOKIE_CONSENT,
  KEY_STATE_REMEMBER_ME,
  KEY_STORAGE_AUTH_HANDOFF,
} from 'common/keyState'
import { BrowserPersister } from './BrowserPersister'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // @ts-expect-error - cacheTime not defined but it is documented
      cacheTime: 1000 * 60 * 60 * 24 * 90, // 90 days
      // Default is 3 retries — that silently quadruples request volume on
      // any failing query, which can exhaust tight rate-limit buckets (e.g.
      // geo-country) from a single unrelated error. 4xx responses won't
      // succeed on retry, so only retry once and only for non-4xx errors.
      retry: (failureCount: number, error: unknown) => {
        const status = isAxiosError(error) ? error.response?.status : undefined
        if (status && status >= 400 && status < 500) return false
        return failureCount < 1
      },
    },
  },
})

queryClient.setQueryDefaults([KEY_STATE_REMEMBER_ME], {
  staleTime: Infinity,
  meta: { persistence: { enabled: true, storageType: 'local' } },
})

// Exported so each app's root can mount <PersistQueryClientProvider persistOptions={{ persister:
// browserPersister }}>. Restoration must gate rendering (via useIsRestoring()) rather than run
// as a fire-and-forget side effect here — a bare persistQueryClient() call lets any query with a
// synchronous/near-instant queryFn (e.g. useAuth's `queryFn: async () => null`) resolve and set a
// fresh dataUpdatedAt before the persisted snapshot finishes loading from storage. TanStack
// Query's hydrate() only overwrites a query if the persisted data is NEWER, so the live
// resolution wins and the real (older) persisted session is silently discarded.
export const browserPersister = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'session',
    storageKey: 'veysur.queryCache',
    buildVersion: process.env.BUILD_VERSION,
    protectedQueryKeyPrefixes: [
      KEY_STATE_AUTH,
      KEY_STATE_SURVEY_AUTH,
      KEY_STATE_COOKIE_CONSENT,
      KEY_STATE_REMEMBER_ME,
    ],
    // Only the auth session follows the "remember me" choice into localStorage. Application
    // data always stays in sessionStorage (cleared on browser close), so a remembered login
    // no longer drags the entire query cache into long-lived storage.
    rememberableQueryKeyPrefixes: [KEY_STATE_AUTH],
    isRemembered: (queries) => {
      const rememberMeQuery = queries.find(
        (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === KEY_STATE_REMEMBER_ME,
      )
      return (rememberMeQuery?.state?.data as boolean | undefined) === true
    },
    // sessionStorage already clears on browser close; this only bounds stale app data in a
    // tab left open for days. localStorage (the remembered auth blob) is capped at the API
    // access-token horizon (API_JWT_ACCESS_TOKEN_TTL_SECONDS default, 180 days).
    sessionMaxAge: 1000 * 60 * 60 * 24,
    localMaxAge: 1000 * 60 * 60 * 24 * 180,
  },
)

// Consume cross-domain auth handoff written by the popup window.
// localStorage is shared across all windows of the same origin, so the main
// window can read what the popup wrote before closing.
const rawHandoff = localStorage.getItem(KEY_STORAGE_AUTH_HANDOFF)
if (rawHandoff) {
  localStorage.removeItem(KEY_STORAGE_AUTH_HANDOFF)
  try {
    const { auth, rememberMe } = JSON.parse(rawHandoff)
    // Order matters: rememberMe must be set before auth so the persist cycle triggered by the
    // auth write sees the correct value in `isRemembered` and routes the auth blob to the
    // right storage tier.
    queryClient.setQueryData([KEY_STATE_REMEMBER_ME], rememberMe ?? false)
    queryClient.setQueryData([KEY_STATE_AUTH], auth ?? null)
  } catch {
    // Malformed handoff — ignore
  }
}

export function clearVeysurStorage(): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith('veysur.')) keysToRemove.push(key)
    }
    for (const key of keysToRemove) storage.removeItem(key)
  }
}

export function clearPersistedCache(): void {
  clearVeysurStorage()
}

export { queryClient }
