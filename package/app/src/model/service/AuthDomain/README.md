# AuthDomain

Provides centralized cross-domain authentication using JWT tokens. This enables a single auth domain to serve multiple client domains while maintaining security through domain validation and JWT tokens.

## Architecture

The module follows SOLID principles with a facade pattern:

```
AuthDomain/
├── index.ts                    # Public exports
├── types.ts                    # Interfaces for dependency injection
├── AuthDomain.ts               # Facade (orchestrator, backward-compatible)
├── AuthDomainPopup.ts          # Popup window authentication handler
├── BrowserInterface.ts         # Browser abstraction for testing
├── AuthDomainConfig.ts         # Configuration (environment variables, paths)
├── AuthDomainValidator.ts      # Domain authorization validation
├── AuthDomainMessaging.ts      # PostMessage protocol handling
├── AuthDomainWindow.ts         # Popup window lifecycle management
├── AuthDomainNavigation.ts     # URL building and redirects
└── AuthDomainUI.ts             # Overlay rendering and styling
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

### Auth Handoff (popup → main window)

The cross-domain auth transfer uses a **localStorage handoff key** (`veysur.authHandoff`) rather than the React Query cache:

- `sessionStorage` is per-tab: data written by the popup is invisible to the main window after navigation. `localStorage` is shared across all windows of the same origin.
- The popup writes `{ auth, rememberMe }` to `veysur.authHandoff` and immediately signals `auth-complete`. No React state change is needed.
- `queryClient.ts` reads and removes the handoff on module initialisation (before React renders), so auth is available synchronously on first render.
- `rememberMe` travels through the postMessage payload so the target domain honours the user's persistence preference (sessionStorage vs localStorage).

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

| Module                 | Responsibility                                                                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthDomainConfig`     | Environment config, paths, bypass domain checking; `getAuthLoginUrl()` builds the full account login URL used by platform links                                                                                                                            |
| `AuthDomainValidator`  | Domain authorization, URL host extraction                                                                                                                                                                                                                  |
| `AuthDomainWindow`     | Popup creation, styling, lifecycle management                                                                                                                                                                                                              |
| `AuthDomainMessaging`  | PostMessage event handling; sends `{ auth, rememberMe }` payload to popup; polls for ready/complete signals with fallback; uses `window focus` event to bypass background-tab timer throttling; calls `finish()` when popup closes without `auth-complete` |
| `AuthDomainNavigation` | URL building, redirect handling                                                                                                                                                                                                                            |
| `AuthDomainUI`         | Loading overlay, theme-aware styling                                                                                                                                                                                                                       |
| `AuthDomainPopup`      | Receives `{ auth, rememberMe }` in popup window, writes to `veysur.authHandoff` localStorage key, signals `popup-ready` and `auth-complete` to opener                                                                                                      |
| `AuthDomain`           | Facade orchestrating all sub-services                                                                                                                                                                                                                      |

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

// Open project with auth transfer (from account app)
await AuthDomain.openProjectWithAuth(targetUrl, authData, authRefresh)

// Open account app with auth transfer (from a project domain, e.g. "Manage Account")
await AuthDomain.openAccountWithAuth(authData, authRefresh)

// Build the full account login URL (used as loginPath for platform links)
const loginUrl = AuthDomain.getAuthLoginUrl() // e.g. https://account.veysur.com/login
```

## Related

- [Auth Navigation Flows](../../../../docs/auth-navigation.md): end-to-end flows across AuthDomain, AuthLink, AuthBroadcastProvider, and PageLogin
- [BroadcastChannel vs. postMessage](../../../../docs/auth-navigation.md#broadcastchannel-vs-postmessage): why `AuthBroadcastProvider`'s same-origin relay complements this module's cross-origin postMessage handoff
- ADR: [auth-domain-popup-reliability](../../../../docs/decisions/2026/2026-05-11_auth-domain-popup-reliability.md)
- ADR: [auth-link-new-tab](../../../../docs/decisions/2026/2026-06-07_auth-link-new-tab.md)
