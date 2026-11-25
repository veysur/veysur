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
- **Testing**: Jest with React Testing Library, tests in `src/**/*.test.{ts,tsx}`. Console-noise policy (fail-by-default `console.error`/`console.warn`, `allowConsole()` for expected cases) lives in `tests/consoleGuard.ts` and is wired into `tests/setupTests.ts`, see root `AGENTS.md`'s "Console Noise in Tests" section.
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

- `/admin/survey`: list; `/admin/survey/new`, create; `/admin/survey/{surveyId}/edit`, edit
- `/admin/survey/{surveyId}/participant/{participantId}/edit`: nested entity
- `/admin/survey/{surveyId}/response/snapshot/{snapshotId}/add`: composite ID + action
- `/admin/survey/{surveyId}/setting/{section}`: settings

Rules: always follow pattern order; use explicit action suffixes (`/edit`, `/view`, `/add`); entity name without ID = list, with ID = detail/action.

## Application Structure

| App           | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `appAdmin`    | Survey management interface for project owners       |
| `appSurvey`   | Survey-taking interface for participants             |
| `appAccount`  | Account management, including profile                |

An extension may add further sub-apps and API endpoints. Those trees are not part of this repo.

### Embedded survey shell

`src/appSurvey/embed/` is a separate rsbuild entry (`embed` in `rsbuild.config.ts`, output `embed/index.html`)
that other websites show in an iframe. `public/embed/loader.js` is the script customers paste; it injects the
iframe at `/embed/<projectId>/<surveyId>`. The shell reads the static files written at publish and makes no API
call until the first answer, when it requests the participant JWT and reports its ancestor origin in
`X-Embed-Origin` (`embedAncestorOrigin.ts`, which sends `unknown` rather than omit the header). The admin side is
`appAdmin/component/SurveyEmbed/` (Share tab card and snippet builder). Keep the shell free of `useAuth()` and
other eager API calls. Design and API behaviour: `package/api/docs/embedded-surveys.md`.

### Import boundary (lint-enforced)

Shared code (`src/component/**`, `src/hook/**`, `src/common/**`, `src/registry/**`) **may
not import** any sub-app tree (`appAdmin/**`, `appSurvey/**`, `appAccount/**`, or an
extension's). `appAdmin/**` and `appSurvey/**` **may not import** extension code. `pnpm lint`
enforces this (`no-restricted-imports` in `eslint.config.mjs`).

The rule runs at `error`, `pnpm lint` fails on any violation.

## Data Fetching

Use TanStack Query for all data fetching and mutations (`useQuery` / `useMutation`).

### CRITICAL: Construct model objects in the hook's return statement, NOT in `queryFn`

React Query serializes data for caching, constructors, methods, and collection helpers are lost on cache hit.

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
Queries persist via `BrowserPersister` (sessionStorage by default, localStorage with "Remember me"; override with `meta: { persistence: { storageType: 'local' } }` for non-sensitive UI preferences). Every persistent storage key uses the `veysur.` prefix so logout can sweep it.

### Cache Invalidation
Build every mutation that invalidates a query with `useInvalidatingMutation` (`src/hook/useInvalidatingMutation.ts`), never a raw `useMutation` with manual `onSuccess` invalidation. A get-hook and every mutation hook affecting its data share one exported `KEY_STATE_*` constant from the sub-app's `keyState.ts`; invalidate the list and the detail. Shared key helpers are pure functions returning `QueryKey[]`. Full rules and reviewer checklist: [docs/data-fetching-rules.md](docs/data-fetching-rules.md) and [docs/mutation-cache-invalidation.md](docs/mutation-cache-invalidation.md).

## Dates & timezones

Format timestamps for display only through the helpers in `src/common/formatDateTime.ts`
(`formatDate`, `formatDateTime`, `formatCalendar`, …), never a bare `momentTimezone(x).format(...)`
in a component. Pass the zone from the sub-app's `useDisplayTimezone()` hook (`appAdmin` → project
zone, `appAccount` → browser zone). State the zone once per
view with `<TimezoneNotice>` or a heading suffix, not on every timestamp. Full reference:
[/docs/timestamps.md](../../docs/timestamps.md).

## Hook Conventions

**Hooks must NOT take auth or project as parameters**: use `useAuth()` and `useProjectDomain()` internally:

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

**Build every authenticated `useQuery` in `appAdmin`/`appAccount` with `useAuthdQuery`** (`src/hook/useAuthdQuery.ts`), not a raw `useQuery`: it awaits the JWT refresh before `queryFn`, so a query that fires before any `useAuth()` has registered cannot 401 on a stale token. Exceptions (plain `useQuery`): `useAuth.ts`'s own query, local-only hooks (`usePaginationPerPage`, `useCookieConsent`) and unauthenticated pre-login queries (geo lookups).

**`authRefresh(true)` calls must stay.** Force-refresh after any mutation that changes auth-related user data (email verification, 2FA toggle) to reload React auth state. This is distinct from keeping the JWT fresh, it pushes a server-side change into the React layer.

## Detailed Implementation Patterns

For API class, Factory/Registry, Schema, Form, Edit Page patterns and component organization, see `src/AGENTS.md` (auto-discovered when working inside `src/`).

## React Component Optimisations

**Hoist shared layout wrappers, don't repeat them across early-return branches.**

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
