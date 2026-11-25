# Query persistence and cache invalidation

### Query Persistence

Queries are persisted via `BrowserPersister` (`src/common/BrowserPersister/` — see its AGENTS.md).

- **Default**: sessionStorage; switches to localStorage when user has "Remember me" checked
- **Explicit override**: `meta: { persistence: { storageType: 'local' } }` for non-sensitive UI preferences (items-per-page, collapse state)
- **Storage key naming**: all keys must use the `veysur.` prefix. `clearVeysurStorage()` from `common/queryClient` sweeps all `veysur.*` keys on logout — any new persistent key must follow this convention

## Cache Invalidation

Every mutation hook must invalidate every query key whose underlying data the mutation changed — the list AND the detail, not just one. **Build every mutation hook that invalidates a query with `useInvalidatingMutation`** (`/package/app/src/hook/useInvalidatingMutation.ts`), not a raw `useMutation` with a manual `onSuccess: () => { queryClient.invalidateQueries(...) }`. Plain `onSuccess` invalidation is a footgun: TanStack Query only waits for `onSuccess` if it _returns_ the invalidation promise, and a forgotten `return` means `mutateAsync` resolves before the refetch lands — the mutation appears to succeed but the UI renders stale data until an unrelated later refetch. `useInvalidatingMutation` makes this mistake structurally impossible. See [docs/mutation-cache-invalidation.md](docs/mutation-cache-invalidation.md) for the full API (declarative `invalidateKeys`, deriving keys from `data`/`variables`, conditional invalidation, extra post-invalidation work via `onSuccess`).

- **A get-hook and every mutate-hook that affects its data must reference the same exported `KEY_STATE_*` constant.** Never duplicate the string literal by hand — a re-typed copy can drift or go stale silently (no error, no warning; the query just never refreshes).
- When a mutation affects several related caches, invalidate all of them via the same `invalidateKeys` array/function (see `useSurveyResponseUpdate.ts` for the reference example). Shared invalidation helpers (e.g. `surveyResponseQueryKeys.ts`) are pure functions returning `QueryKey[]`, never functions that call `queryClient.invalidateQueries` themselves — see the mutation-cache-invalidation doc for why.
- Each sub-app keeps its query keys in a `keyState.ts` beside its other shared constants. If you add or touch a query key, add/use a `KEY_STATE_*` constant there — do not add another raw string literal.
- Invalidation is independent of persistence — `invalidateQueries()` is sufficient; you don't need to touch `BrowserPersister` or clear storage manually (see Query Persistence above).

**Reviewer checklist for any new/changed mutation hook:**

1. List every `useQuery` whose data this mutation changes (search for hooks reading the same entity).
2. Confirm the hook is built with `useInvalidatingMutation` and its `invalidateKeys` covers the same `KEY_STATE_*` constant each of those queries uses — not a re-typed string literal, and not a raw `useMutation` with manual `onSuccess` invalidation.
3. If no shared constant exists yet for a key you're adding, add it to that app's `keyState.ts` first.
