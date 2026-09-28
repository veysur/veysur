# AuthDomain

Provides centralized cross-domain authentication using JWT tokens. This enables a single auth domain to serve multiple client domains while maintaining security through domain validation and JWT tokens.

## Architecture

The module follows SOLID principles with a facade pattern:

```
AuthDomain/
├── index.ts                    # Public exports
├── types.ts                    # Interfaces for dependency injection
├── AuthDomain.ts               # Facade (orchestrator, backward-compatible)
├── BrowserInterface.ts         # Browser abstraction for testing
├── AuthDomainConfig.ts         # Configuration (environment variables, paths)
├── AuthDomainValidator.ts      # Domain authorization validation
├── AuthDomainNavigation.ts     # URL building and redirects
└── AuthDomainUI.ts             # Redirect overlay rendering and styling
```

### Cold-tab restoration and `useIsRestoring()`

Consumers of `AuthGate` (and the `useAuthLoginRedirect` hook) must not make an auth decision
before the persisted session cache has finished restoring. Each app root mounts
`PersistQueryClientProvider` (not a bare `QueryClientProvider` + fire-and-forget
`persistQueryClient()` call) so that `useIsRestoring()` is available, and `useAuth()`
(`hook/useAuth.ts`, `appAdmin/hook/useAuth.ts`) sets `enabled: !isRestoring` on its query.

This matters because `useAuth()`'s query has a near-instant `queryFn` (`async () => null`). On a
cold tab, if that query is allowed to fetch before restoration completes, it resolves with a
fresh `dataUpdatedAt` that beats the persisted (older) snapshot — TanStack Query's `hydrate()`
only overwrites a query when the persisted data is _newer_, so the live `null` resolution wins
and a real, already-logged-in session is silently discarded. See `common/queryClient.test.ts`
for a reproduction of both the bug and the fix. `AuthGate` and `useAuthLoginRedirect` also gate
their own auth-decision logic on `useIsRestoring()` directly, to avoid bouncing an
already-authenticated user through login while restoration is still in flight.

### Auth Handoff (server-side mint/redeem)

Cross-domain transfer is a server-side handoff, not a popup: the initiating domain mints a
short-lived (60s), single-use token via `POST /auth-handoff` (the server derives the session
payload entirely from the caller's own authenticated request - never from client input) and
does a plain top-level redirect to `<targetUrl>?auth-handoff=<token>`. The target domain
redeems it via `POST /auth-handoff/redeem` before rendering. No popup, no `postMessage`, no
`window.opener` dependency (so a future `Cross-Origin-Opener-Policy` header on either app
can't break this the way it would have broken the old popup approach - see the ADR).

- `AuthDomain.consumeIncomingHandoffIfPresent()` reads `?auth-handoff=` from the URL, redeems
  it, and applies `{ auth, rememberMe }` directly to the query cache (`queryClient.setQueryData`)
  - each sub-app's `index.tsx` awaits this before rendering.
- It also writes the same payload to the `veysur.authHandoff` localStorage key that
  `queryClient.ts`'s own module-init read consumes, purely so the
  `package/api-cloud/src/script/debug-mint-token.ts` dev/e2e session-injection path keeps
  working - the direct `setQueryData` call is what actually applies it, since this module's own
  import chain typically evaluates `queryClient.ts` (finding nothing yet) before
  `consumeIncomingHandoffIfPresent()` runs.
- `rememberMe` is a client-supplied preference in the mint request body (mirrors
  `KEY_STATE_REMEMBER_ME`); the `auth` payload itself is always server-derived.
- `AuthDomain.markLoginSubmitted()`/`consumeLoginJustSubmitted()` replaces the old
  `prepareTargetWindow()` popup-open call as the signal `useAuthLoginRedirect` uses to tell a
  just-submitted "New Login" apart from an already-authenticated page load - no popup, so no
  user-gesture timing constraint remains, but the "New Login auto-proceeds, already-authenticated
  shows a Continue button" UX split is preserved.

## Environment Variables

| Variable                                 | Default                         | Description                                   |
| ---------------------------------------- | ------------------------------- | --------------------------------------------- |
| `PUBLIC_AUTHENTICATION_DOMAIN`           | (current host)                  | Central auth domain hostname                  |
| `PUBLIC_AUTHENTICATION_HOME_PATH`        | `/admin`                        | Home path for project domains                 |
| `PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH` | `PUBLIC_BASE_ACCOUNT`, else `/` | Home path for auth domain                     |
| `PUBLIC_AUTHENTICATION_LOGIN_PATH`       | `/login`                        | Login page path                               |
| `PUBLIC_AUTHENTICATION_LOGOUT_PATH`      | `/logout`                       | Logout page path                              |
| `PUBLIC_AUTHENTICATION_BYPASS_DOMAINS`   | (empty)                         | Comma-separated domains to skip auth redirect |

## Module Responsibilities

| Module                 | Responsibility                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `AuthDomainConfig`     | Environment config, paths, bypass domain checking; `getAuthLoginUrl()` builds the full account login URL used by platform links    |
| `AuthDomainValidator`  | Domain authorization, URL host extraction                                                                                          |
| `AuthDomainNavigation` | URL building, redirect handling                                                                                                    |
| `AuthDomainUI`         | Redirect overlay, theme-aware styling (covers the async gap between click and the browser navigating away)                         |
| `ApiAuthHandoff`       | (`model/api/ApiAuthHandoff.ts`) REST client for `POST /auth-handoff` (mint) and `POST /auth-handoff/redeem` (redeem)                 |
| `AuthDomain`           | Facade orchestrating all sub-services, plus the mint/redirect and redeem orchestration itself                                     |

## Testing

The `AuthDomain` class exposes a `browserInterface` property and `resetServices()` method for testing:

```typescript
beforeEach(() => {
  AuthDomain.browserInterface = {
    getLocation: jest.fn().mockReturnValue({ ... }),
    setLocation: jest.fn(),
    // ... other mocked methods
  }
  AuthDomain.resetServices() // Required after mocking browserInterface
})
```

## Usage

```typescript
import { AuthDomain } from 'model/service/AuthDomain'

// Check if on auth domain
if (AuthDomain.onAuthDomain()) {
  // Handle auth domain logic
}

// Redirect to auth domain for login (returns to the configured auth home path)
AuthDomain.redirectToAuthDomain()

// Redirect to auth domain for login, preserving a deep link (pathname + search) so the
// user lands back where they started once authenticated, instead of the fixed home path
AuthDomain.redirectToAuthDomain(
  '/team-invite/accept?code=abc&email=user@example.com',
)

// Handle successful authentication
AuthDomain.handleAuthed(navigate, authData)

// Handle logout
AuthDomain.handleLogout()

// Open project with auth transfer (from account app). authData is used only for the
// domain-authorization check - the server derives the session payload itself.
await AuthDomain.openProjectWithAuth(targetUrl, authData, authRefresh)

// Open account app with auth transfer (from a project domain, e.g. "Manage Account")
await AuthDomain.openAccountWithAuth(authData, authRefresh)

// Consume an incoming ?auth-handoff=<token> before rendering (called from each
// sub-app's index.tsx)
await AuthDomain.consumeIncomingHandoffIfPresent()

// Build the full account login URL (used as loginPath for platform links)
const loginUrl = AuthDomain.getAuthLoginUrl() // e.g. https://account.veysur.com/login
```

## Related

- [Auth Navigation Flows](../../../../docs/auth-navigation.md): end-to-end flows across AuthDomain, AuthLink, AuthBroadcastProvider, and PageLogin
- ADR: [auth-domain-redirect-handoff](../../../../docs/decisions/2026/2026-09-28_auth-domain-redirect-handoff.md): this module's current design (mint/redeem handoff, no popup)
- ADR: [auth-domain-popup-reliability](../../../../docs/decisions/2026/2026-05-11_auth-domain-popup-reliability.md): superseded by the above, kept for history
- ADR: [auth-link-new-tab](../../../../docs/decisions/2026/2026-06-07_auth-link-new-tab.md)
