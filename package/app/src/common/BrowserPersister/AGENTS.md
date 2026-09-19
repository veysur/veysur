# BrowserPersister

Routes TanStack Query cache to `localStorage` or `sessionStorage` on a per-query basis. All queries are persisted automatically — this directory controls the routing rules.

## Key rules

- **Default storage**: `sessionStorage` — cleared when the browser closes. Application data always lives here regardless of login mode.
- **Rememberable keys**: `queryKey[0]` values listed in `rememberableQueryKeyPrefixes` (`queryClient.ts`) go to `localStorage` when `isRemembered` returns true (the user checked "Remember me" at login, tracked by the `rememberMe` query), and `sessionStorage` otherwise. Only the auth session (`KEY_STATE_AUTH`) is on this list, so a remembered login persists the session without dragging the rest of the query cache into long-lived storage.
- **Explicit override**: set `meta.persistence.storageType` on a query to pin it regardless of login mode:
  - `'local'` — for non-sensitive UI preferences (items-per-page, editor collapse state) that should always persist
  - `'session'` — for data that must never survive a browser close (e.g. redirect state)
- **Storage key naming**: all keys must use the `veysur.` prefix (e.g. `veysur.queryCache`). `clearVeysurStorage()` from `common/queryClient` sweeps all `veysur.*` keys from both storages on logout — any new key holding user or session data must follow this convention.
- Do **not** add explicit persistence to API-data queries — the `sessionStorage` default is correct for them. Auth is handled by `rememberableQueryKeyPrefixes`, not `meta`. Any future key that must survive a deploy no matter what (unrecoverable or user-visible state) must be added to `protectedQueryKeyPrefixes` in `queryClient.ts`.
- **Per-store age caps**: `restoreClient` discards a store's blob when its persisted `timestamp` is older than `sessionMaxAge` (bounds stale app data in a tab left open for days) or `localMaxAge` (caps the remembered auth session at the API access-token horizon). The `PersistQueryClientProvider` `maxAge` is set to `Infinity` in every app root so this per-store logic is the only age gate — the provider default would otherwise drop both stores together via `removeClient()`.
- **Version-aware restore filtering**: every persisted blob is stamped with the app's `BUILD_VERSION` on write. On restore, if the stamp doesn't match the current `BUILD_VERSION` (or is missing, e.g. a blob written before this feature existed), every query is dropped except those whose `queryKey[0]` is listed in `protectedQueryKeyPrefixes` — dropped queries aren't deleted forever, just not rehydrated, so they refetch normally. This stops stale response shapes from a previous deploy silently breaking the UI, without needing a manual storage clear.

See `browserPersister.example.md` in this directory for full configuration examples.
