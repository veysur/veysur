# Agent Guidelines for VeySur React Frontend (repo/app/)

## Project Overview

React application built with TypeScript, RSBuild, and Jest. This is the main frontend interface for the VeySur platform.

## Build/Test Commands

- `pnpm dev` - Start development server
- `pnpm build` - Production build
- `pnpm test` - Run Jest tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test src/path/to/component.test.tsx` - Run single test file
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - TypeScript type checking
- `pnpm preview` - Preview production build

## Code Style

- **Types**: Strict TypeScript, explicit types required (noImplicitAny)
- **React**: JSX runtime, functional components, hooks pattern
- **Testing**: Jest with React Testing Library, tests in `src/**/*.test.{ts,tsx}`. Console-noise policy (fail-by-default `console.error`/`console.warn`, `allowConsole()` for expected cases) lives in `tests/consoleGuard.ts` and is wired into `tests/setupTests.ts` — see root `AGENTS.md`'s "Console Noise in Tests" section.
- **Imports**: Use ES6 imports, prefer named imports. Group imports: global (node_modules) → project relative → file relative, separated by blank lines
- **Formatting**: Prettier config: 2 spaces, no semicolons, single quotes, trailing commas

## Key Dependencies

- React 19.1.1 with TypeScript
- RSBuild for bundling
- Bootstrap + React Bootstrap for UI
- TanStack Query for data fetching and mutations
- Zustand for state management
- React Router for navigation
- Jest + React Testing Library for testing

## URL Structure Pattern

URLs follow a consistent hierarchical pattern: `/{app}/{entity}/{id}/{composite-id}/{action}`

- `/admin/survey` — list; `/admin/survey/new` — create; `/admin/survey/{surveyId}/edit` — edit
- `/admin/survey/{surveyId}/participant/{participantId}/edit` — nested entity
- `/admin/survey/{surveyId}/response/snapshot/{snapshotId}/add` — composite ID + action
- `/admin/survey/{surveyId}/setting/{section}` — settings

Rules: always follow pattern order; use explicit action suffixes (`/edit`, `/view`, `/add`); entity name without ID = list, with ID = detail/action.

## Application Structure

| App           | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `appAdmin`    | Survey management interface for project owners       |
| `appSurvey`   | Survey-taking interface for participants             |
| `appAccount`  | Account management, including profile                |

An extension may add further sub-apps and API endpoints. Those trees are not part of this repo.

### Import boundary (lint-enforced)

Shared code (`src/component/**`, `src/hook/**`, `src/common/**`, `src/registry/**`) **may
not import** any sub-app tree (`appAdmin/**`, `appSurvey/**`, `appAccount/**`, or an
extension's). `appAdmin/**` and `appSurvey/**` **may not import** extension code. `pnpm lint`
enforces this (`no-restricted-imports` in `eslint.config.mjs`).

The rule runs at `error` — `pnpm lint` fails on any violation.

## Data Fetching

Use TanStack Query for all data fetching and mutations (`useQuery` / `useMutation`).

### CRITICAL: Construct model objects in the hook's return statement, NOT in `queryFn`

React Query serializes data for caching — constructors, methods, and collection helpers are lost on cache hit.

```typescript
export function useSurveySnapshot(surveyId: string, snapshotId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['survey-snapshot', surveyId, snapshotId],
    queryFn: async () => {
      return api.get(surveyId, snapshotId) // ❌ do NOT new Survey() here
    },
  })

  const survey = data?.survey ? new Survey(data.survey) : null // ✅ construct here

  return {
    survey,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
```

### Query Persistence

Queries are persisted via `BrowserPersister` (`src/common/BrowserPersister/` — see its AGENTS.md).

- **Default**: sessionStorage; switches to localStorage when user has "Remember me" checked
- **Explicit override**: `meta: { persistence: { storageType: 'local' } }` for non-sensitive UI preferences (items-per-page, collapse state)
- **Storage key naming**: all keys must use the `veysur.` prefix. `clearVeysurStorage()` from `common/queryClient` sweeps all `veysur.*` keys on logout — any new persistent key must follow this convention

### Cache Invalidation

Every mutation hook must invalidate every query key whose underlying data the mutation changed — the list AND the detail, not just one. **Build every mutation hook that invalidates a query with `useInvalidatingMutation`** (`/package/app/src/hook/useInvalidatingMutation.ts`), not a raw `useMutation` with a manual `onSuccess: () => { queryClient.invalidateQueries(...) }`. Plain `onSuccess` invalidation is a footgun: TanStack Query only waits for `onSuccess` if it _returns_ the invalidation promise, and a forgotten `return` means `mutateAsync` resolves before the refetch lands — the mutation appears to succeed but the UI renders stale data until an unrelated later refetch. `useInvalidatingMutation` makes this mistake structurally impossible. See [docs/mutation-cache-invalidation.md](docs/mutation-cache-invalidation.md) for the full API (declarative `invalidateKeys`, deriving keys from `data`/`variables`, conditional invalidation, extra post-invalidation work via `onSuccess`).

- **A get-hook and every mutate-hook that affects its data must reference the same exported `KEY_STATE_*` constant.** Never duplicate the string literal by hand — a re-typed copy can drift or go stale silently (no error, no warning; the query just never refreshes).
- When a mutation affects several related caches, invalidate all of them via the same `invalidateKeys` array/function (see `useSurveyResponseUpdate.ts` for the reference example). Shared invalidation helpers (e.g. `surveyResponseQueryKeys.ts`) are pure functions returning `QueryKey[]`, never functions that call `queryClient.invalidateQueries` themselves — see the mutation-cache-invalidation doc for why.
- Each sub-app keeps its query keys in a `keyState.ts` beside its other shared constants. If you add or touch a query key, add/use a `KEY_STATE_*` constant there — do not add another raw string literal.
- Invalidation is independent of persistence — `invalidateQueries()` is sufficient; you don't need to touch `BrowserPersister` or clear storage manually (see Query Persistence above).

**Reviewer checklist for any new/changed mutation hook:**

1. List every `useQuery` whose data this mutation changes (search for hooks reading the same entity).
2. Confirm the hook is built with `useInvalidatingMutation` and its `invalidateKeys` covers the same `KEY_STATE_*` constant each of those queries uses — not a re-typed string literal, and not a raw `useMutation` with manual `onSuccess` invalidation.
3. If no shared constant exists yet for a key you're adding, add it to that app's `keyState.ts` first.

## Dates & timezones

Format timestamps for display only through the helpers in `src/common/formatDateTime.ts`
(`formatDate`, `formatDateTime`, `formatCalendar`, …) — never a bare `momentTimezone(x).format(...)`
in a component. Pass the zone from the sub-app's `useDisplayTimezone()` hook (`appAdmin` → project
zone, `appAccount` → browser zone). State the zone once per
view with `<TimezoneNotice>` or a heading suffix, not on every timestamp. Full reference:
[/docs/timestamps.md](../../docs/timestamps.md).

## Hook Conventions

**Hooks must NOT take auth or project as parameters** — use `useAuth()` and `useProjectDomain()` internally:

```typescript
// ❌ BAD
export function useEntityList(projectId: string, jwt: string) { ... }

// ✅ GOOD
export function useEntityList() {
  const project = useProjectDomain()
  const { data } = useAuthdQuery({
    queryFn: async () => {
      if (!project?._id) return
      return getEntityApi().getAll()
    },
  })
}
```

**Build every authenticated `useQuery` in `appAdmin`/`appAccount` with `useAuthdQuery`** (`/package/app/src/hook/useAuthdQuery.ts`), not a raw `useQuery`. `RestClient`'s JWT refresh (`jwtRefresher`) is registered by whichever `useAuth()`-calling component's `useEffect` happens to mount first — there is no single provider owning it, so a query that fires before any `useAuth()` instance has registered can go out with a stale token and 401 intermittently. `useAuthdQuery` closes this deterministically by awaiting `authRefreshWithRetry()` from its own local `useAuth()` instance before running `queryFn`, regardless of mount order. `useInvalidatingMutation` does the same for `mutationFn`, so mutation hooks get this for free. Exceptions (leave on plain `useQuery`): `useAuth.ts`'s own `[KEY_STATE_AUTH]` query (would be circular), local-persistence-only hooks with no network call (e.g. `usePaginationPerPage.ts`, `useCookieConsent.ts`), and genuinely unauthenticated/pre-login queries (e.g. the geo lookups in `useBlockedCountries.ts` and `useCountryAccess.ts`).

**`authRefresh(true)` calls must stay.** Force-refresh after any mutation that changes auth-related user data (email verification, 2FA toggle) to reload React auth state. This is distinct from keeping the JWT fresh — it pushes a server-side change into the React layer.

**`authRefresh(true)` calls must stay.** Force-refresh after any mutation that changes auth-related user data (email verification, 2FA toggle) to reload React auth state. This is distinct from keeping the JWT fresh — it pushes a server-side change into the React layer.

## Detailed Implementation Patterns

For API class, Factory/Registry, Schema, Form, Edit Page patterns and component organization, see `src/AGENTS.md` (auto-discovered when working inside `src/`).

## React Component Optimisations

**Hoist shared layout wrappers — don't repeat them across early-return branches.**

When multiple branches of a component return the same outer wrapper (e.g. a page layout + centering div), extract that wrapper into a single return and render the varying content inside it using ternary or conditional expressions:

```tsx
// ❌ BAD: layout wrapper copy-pasted across every branch
if (!email) {
  return (
    <PageLayout>
      <div className="wrapper">
        <ErrorMessage />
      </div>
    </PageLayout>
  )
}
if (status === 'loading') {
  return (
    <PageLayout>
      <div className="wrapper">
        <Spinner />
      </div>
    </PageLayout>
  )
}
return (
  <PageLayout>
    <div className="wrapper">
      <Form />
    </div>
  </PageLayout>
)

// ✅ GOOD: wrapper appears once, content varies inside
return (
  <PageLayout>
    <div className="wrapper">
      {!email ? (
        <ErrorMessage />
      ) : status === 'loading' ? (
        <Spinner />
      ) : (
        <Form />
      )}
    </div>
  </PageLayout>
)
```

This makes future layout changes a single edit and reduces overall component size.
