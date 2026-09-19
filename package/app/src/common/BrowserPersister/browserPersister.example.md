# Query Persistence Usage Guide

This guide shows how to use per-query storage persistence with TanStack Query via `BrowserPersister`.

## Overview

Control where each query's data is persisted by adding a `meta.persistence` property to `useQuery` calls:

- **Storage type**: `localStorage` (cross-session) or `sessionStorage` (current session only)
- **Opt out**: set `enabled: false` or omit `meta.persistence` entirely to use the default

## Usage Examples

### Persist to localStorage (cross-session)

Use for non-sensitive UI preferences that should survive browser close:

```typescript
useQuery({
  queryKey: ['paginationPerPage', key],
  queryFn: async () => defaultValue,
  staleTime: Infinity,
  meta: { persistence: { storageType: 'local' } },
})
```

### Persist to sessionStorage (current session only)

Use for temporary state that must not outlive the browser session:

```typescript
useQuery({
  queryKey: [KEY_STATE_REDIRECT_PENDING],
  queryFn: async () => null,
  staleTime: Infinity,
  meta: { persistence: { storageType: 'session' } },
})
```

### Disable persistence

```typescript
useQuery({
  queryKey: ['liveData'],
  queryFn: fetchLiveData,
  meta: { persistence: { enabled: false } },
})
```

## Default Behaviour

`BrowserPersister` is configured in `queryClient.ts` with `storageType: 'session'` as the static default. Queries without an explicit `meta.persistence.storageType` persist to **sessionStorage** and are cleared when the browser closes — this is the right default for API data.

A small set of `queryKey[0]` values (`rememberableQueryKeyPrefixes`) follows the "Remember me" choice instead:

```typescript
const browserPersister = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'session',
    rememberableQueryKeyPrefixes: [KEY_STATE_AUTH],
    isRemembered: (queries) => {
      const rememberMeQuery = queries.find(
        (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === KEY_STATE_REMEMBER_ME,
      )
      return (rememberMeQuery?.state?.data as boolean | undefined) === true
    },
    sessionMaxAge: 1000 * 60 * 60 * 24,
    localMaxAge: 1000 * 60 * 60 * 24 * 180,
  },
)
```

**What this means:**

- A query key in `rememberableQueryKeyPrefixes` (only `KEY_STATE_AUTH`) → **localStorage** when the user checked "Remember me", **sessionStorage** otherwise.
- Every other query without explicit `meta.persistence.storageType` → **sessionStorage**, regardless of "Remember me". A remembered login therefore persists the session alone, not the whole query cache.
- Queries with an explicit `storageType` in their meta always use that storage. Use explicit `storageType: 'local'` for non-sensitive UI preferences (items-per-page, editor collapse state, etc.) that should persist regardless of login mode.

## Override Priority

1. **Query-level**: `meta.persistence.storageType` in the `useQuery` call
2. **Rememberable prefix**: `queryKey[0]` in `rememberableQueryKeyPrefixes` → localStorage when `isRemembered` is true, sessionStorage otherwise
3. **Static default**: `storageType` constructor option (`'session'`)

## Real-World Examples from the Codebase

### Pagination preference (always localStorage)

```typescript
// hook/usePaginationPerPage.ts
useQuery({
  queryKey: ['paginationPerPage', key],
  queryFn: async () => defaultValue,
  staleTime: Infinity,
  meta: { persistence: { storageType: 'local' } }, // UI pref — always persist
})
```

### Redirect pending (always sessionStorage)

```typescript
// model/service/RedirectPending.ts
queryClient.setQueryDefaults([KEY_STATE_REDIRECT_PENDING], {
  staleTime: Infinity,
  meta: { persistence: { storageType: 'session' } }, // Transient — session only
})
```

### Auth state (rememberable — no explicit meta)

```typescript
// hook/useAuth.ts
useQuery({
  queryKey: [KEY_STATE_AUTH],
  queryFn: async () => null,
  staleTime: Infinity,
  // No meta.persistence — KEY_STATE_AUTH is in rememberableQueryKeyPrefixes, so it
  // goes to localStorage when "Remember me" is checked, sessionStorage otherwise.
})
```

### Remember me preference (always localStorage)

```typescript
// Configured via setQueryDefaults in queryClient.ts
queryClient.setQueryDefaults([KEY_STATE_REMEMBER_ME], {
  staleTime: Infinity,
  meta: { persistence: { enabled: true, storageType: 'local' } },
})
```

## Per-Store Age Caps

`restoreClient` discards a store's blob when its persisted `timestamp` is older than the store's cap:

- `sessionMaxAge` (24h) — sessionStorage already clears on browser close; this only bounds stale application data in a tab left open for days.
- `localMaxAge` (180 days) — caps the remembered auth session at the API access-token horizon (`API_JWT_ACCESS_TOKEN_TTL_SECONDS` default). The server rejects an expired token before then anyway, and `useAuth.authRefresh` calls `logout()` on rejection.

The `PersistQueryClientProvider` `maxAge` is set to `Infinity` in every app root (`appAccount`, `appAdmin`, `appPlatform`, `appSurvey`). The provider default (24h) drops **both** stores together via `removeClient()`, which is what previously logged out remembered users after a day; the per-store caps above replace it.

## TypeScript Support

```typescript
meta: {
  persistence: {
    enabled?: boolean        // default: true
    storageType?: 'local' | 'session'
  }
}
```

## Storage Key

Both localStorage and sessionStorage use the same key for the persisted cache blob. The class default is `QUERY_CACHE`; customise via the `storageKey` constructor option:

```typescript
new BrowserPersister(localStorage, sessionStorage, {
  storageKey: 'veysur.queryCache',
})
```

The project sets `storageKey: 'veysur.queryCache'` (configured in `queryClient.ts`) so it falls under the `veysur.` prefix convention — see Logout Clearing below.

On restore, `BrowserPersister` reads from both storages and merges the results into a single client state.

## Logout Clearing

All Veysur browser storage keys are prefixed `veysur.`. On logout, `clearVeysurStorage()` (exported from `common/queryClient.ts`) iterates both localStorage and sessionStorage and removes every key that starts with `veysur.`. This covers the query cache (`veysur.queryCache`) and all Zustand persisted stores (`veysur.flashMessages`, `veysur.chartTypes`) in one sweep.

```typescript
// common/queryClient.ts
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
```

`clearPersistedCache()` (also in `queryClient.ts`) is the call site used by both `useAuth` logout implementations. It delegates to `clearVeysurStorage()`.

**Convention:** any new localStorage or sessionStorage key that holds user or session data must use the `veysur.` prefix so the logout sweep covers it automatically.

## Version-Aware Restore Filtering

Every persisted blob is stamped with a `veysurBuildVersion` field (storage-only — not part of the `PersistedClient` shape) equal to the `buildVersion` constructor option, which the app sets to `process.env.BUILD_VERSION`:

```typescript
// common/queryClient.ts
export const browserPersister = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    storageKey: 'veysur.queryCache',
    buildVersion: process.env.BUILD_VERSION,
    protectedQueryKeyPrefixes: [
      KEY_STATE_AUTH,
      KEY_STATE_SURVEY_AUTH,
      KEY_STATE_COOKIE_CONSENT,
      KEY_STATE_REMEMBER_ME,
    ],
    // ...
  },
)
```

On `restoreClient`, if a blob's `veysurBuildVersion` does not match the running app's `buildVersion` — including blobs with no stamp at all, e.g. written before this feature existed — every query is dropped except those whose `queryKey[0]` appears in `protectedQueryKeyPrefixes`. Dropped queries are not deleted forever; they simply are not rehydrated and refetch normally once the app mounts.

This exists because a deploy that changes a query's response shape would otherwise leave the old cached blob rehydrated verbatim, breaking the UI until the user manually cleared storage. Auth and survey auth are protected because their tokens are unrecoverable if lost; cookie consent must not silently reset; `rememberMe` is protected because `isRemembered` reads it to decide where new writes (including auth's own re-persist) go — losing it would silently downgrade a "remembered" user to session-scoped storage on the next persist cycle.

**Convention:** any future query key that must survive a deploy no matter what must be added to `protectedQueryKeyPrefixes` in `queryClient.ts` — do not rely on the default filtering behaviour to keep it.

## Implementation

Source: `common/BrowserPersister/BrowserPersister.ts`

1. `persistClient` — examines each query's `meta.persistence`; falls back to the rememberable-prefix rule (`isRemembered`) then the static `storageType` default; routes to localStorage or sessionStorage; stamps the blob with `veysurBuildVersion`
2. `restoreClient` — reads both storages via `readStoredClient` (drops a blob past its `sessionMaxAge` / `localMaxAge`), filters each via `filterStaleClient` (see Version-Aware Restore Filtering above), merges queries
3. `removeClient` — removes the cache key from both storages (available but not used directly; prefer `clearVeysurStorage()`)
