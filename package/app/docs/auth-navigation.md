<!-- cspell:ignore useisrestoring -->

# Authentication Navigation Flows

Documents the end-to-end authentication and navigation flows used across the app. Covers how `AuthDomain`, `AuthLink`, `AuthBroadcastProvider`, and `PageLogin` cooperate to handle login, domain transfer, and right-click new-tab scenarios.

## BroadcastChannel vs. the mint/redirect/redeem handoff

Two different mechanisms transfer auth state between browser contexts, for two different relationships between windows:

|                                     | Same-origin tab, no window reference            | Cross-origin (auth domain ↔ project domain)        |
| ----------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| **BroadcastChannel**                | used (Flows 5 & 6)                                | not possible, channels are scoped per-origin          |
| **mint token + redirect + redeem**  | not needed, same-origin already shares storage    | used (Flows 1, 2, 4, 7, and Flow 5/8's final step)    |

A right-click "open in new tab" produces a tab with no `window.opener` — but that's no longer load-bearing, since the cross-origin leg is a plain top-level redirect, not a popup, and never depends on `window.opener`. `AuthBroadcastProvider`'s same-origin `BroadcastChannel` still exists purely to avoid an unnecessary round trip through the auth domain when the target is same-origin. Flow 5 uses **both**: `BroadcastChannel` for instant same-origin discovery (steps 3–5), then the mint/redirect/redeem handoff for the actual cross-domain transfer (step 6).

## Cold-tab restoration

Every flow below assumes `isAuthed` correctly reflects the browser's real session state on the
first render. On a cold tab that isn't guaranteed: `useAuth()`'s query resolves almost instantly
(`queryFn: async () => null`), and if that resolution beats the persisted-cache restore, it
permanently overwrites a real, older-timestamped session (TanStack Query's `hydrate()` only
applies a persisted snapshot when it's _newer_ than what's already cached). Each app root mounts
`PersistQueryClientProvider` (see `model/service/AuthDomain/README.md#cold-tab-restoration-and-useisrestoring`)
so `useAuth()` can gate its query on `useIsRestoring()`, and `AuthGate`/`useAuthLoginRedirect`
render nothing until restoration completes, before making any redirect decision.

## Flow 9: Direct Deep Link (Cold Tab, e.g. Email Invite Link)

Unlike Flows 1–8, this flow doesn't originate from a click inside the app — the browser has no
prior tab to broadcast to. Example: a team-invite email links straight to
`/team-invite/accept?code=...&email=...`.

1. User opens the link in a tab with no in-memory app state (new window, new profile, or an
   email client's embedded browser)
2. `AuthGate` waits for `useIsRestoring()` to resolve, then checks `isAuthed`
3. **If a valid session restores in time**: `AuthGate` renders the target page directly — no
   redirect happens
4. **If unauthenticated** (including a "not yet restored, and never will be" cold tab) and no
   auth domain is configured, or the app itself _is_ the auth domain: `AuthGate` pushes the
   current path + query to `RedirectPending` (keyed `'authGate'`) and navigates to `/login`.
   Once `isAuthed` becomes true — from a fresh login/signup submission or, after this fix, from
   restoration completing — `useAuthLoginRedirect`'s `checkRedirectPending` option
   (`PageLogin`/`PageSignup`) reads the pending entry and navigates back to the original deep
   link
5. **If unauthenticated and a separate auth domain is configured** (`AuthGate`'s
   `hasAuthDomain() && !onAuthDomain()` branch): `AuthDomain.redirectToAuthDomain(deepLink)`
   carries the current path + query as `returnTo` instead of the fixed auth home path.
   `RedirectPending` can't help here — it's scoped to this origin's session/local storage and
   doesn't survive the cross-domain hop — so `returnTo` is the only carrier

## Flow 1: New Login

1. User visits domain X and needs authentication
2. Redirected to auth domain (`PUBLIC_AUTHENTICATION_DOMAIN`) with `returnTo` parameter — either
   the current deep link (`AuthGate`'s cold-tab redirect, see Flow 9) or an explicit target
   (`AuthLink`, Flows 5/6/8)
3. User logs in via form submission; the form handler calls `AuthDomain.markLoginSubmitted()`
4. Once authenticated, `useAuthLoginRedirect` sees `consumeLoginJustSubmitted()` return `true` and
   proceeds immediately (no "Continue" button)
5. `AuthDomain` mints a handoff token from the auth domain (`POST /auth-handoff` — the server
   derives `{ auth, rememberMe }` from the caller's own request, never from client input) and
   shows a loading overlay while the request is in flight
6. Browser is redirected to `<domain X>?auth-handoff=<token>` (plain top-level navigation)
7. Domain X redeems the token (`POST /auth-handoff/redeem`) before rendering, applies
   `{ auth, rememberMe }` to the query cache, and strips the `auth-handoff` param from the URL

## Flow 2: Already Authenticated (Authorized Domain)

1. User already authenticated on auth domain visits domain X (not authenticated there)
2. Redirected to auth domain with `returnTo` parameter
3. Auth domain detects user is already authenticated
4. Validates that domain X is in user's authorized domains (from `projectOwn`/`projectAdmin`)
5. Shows "Continue" button to user (no prior form submission, so `consumeLoginJustSubmitted()` is `false`)
6. User clicks "Continue"
7. Same mint → redirect → redeem sequence as Flow 1 steps 5–7

## Flow 3: Already Authenticated (Unauthorized Domain)

1. User already authenticated on auth domain visits domain X (not authenticated there)
2. Redirected to auth domain with `returnTo` parameter
3. Auth domain detects user is already authenticated
4. Validates that domain X is NOT in user's authorized domains
5. Shows error message: "The domain you are trying to access is not one of your authenticated domains"
6. Provides "Logout" button with instructions to login directly on target domain

## Flow 4: Open Project (from Account App)

1. User is authenticated on auth domain (account app)
2. User clicks "Open Project" for one of their projects
3. JWT is refreshed if needed
4. `AuthDomain` mints a handoff token from the account domain and shows a loading overlay
5. Browser is redirected to `<project domain X>?auth-handoff=<token>`
6. Project domain X redeems the token before rendering; auth is immediately available

> **Failure path:** if minting or redeeming the token fails (network error, expired token), the
> browser still navigates to the target domain, which simply renders unauthenticated — the user
> can log in normally from there. There is no window to get stuck open.

## Flow 5: Right-Click "Open in New Tab" (Cross-Domain Link)

1. User right-clicks a project link in the account navbar; browser opens a new tab to `/login?returnTo=<project-url>`
2. `PageLogin` mounts with no session (new tab has empty sessionStorage)
3. `PageLogin` broadcasts `REQUEST_AUTH` on the `veysur-auth` BroadcastChannel
4. `AuthBroadcastProvider` (running in the original account-app tab) receives the message and replies with `AUTH_RESPONSE { auth }`
5. `PageLogin` in the new tab receives the response (within 500 ms), sets `broadcastAuth` state, and shows the **Continue** button immediately
6. User clicks Continue: `handleAuthed` transfers the relayed auth via the same mint → redirect → redeem sequence as Flow 2

> If no existing tab responds within 500 ms (e.g. user opened the link in an incognito tab), the login form is shown instead.

## Flow 6: Right-Click "Open in New Tab" (Same-Origin Link)

Applies to any app whose root mounts `AuthBroadcastProvider` and whose navbar links use `AuthLink` with the default `loginPath` (account app, admin app).

1. User right-clicks a navbar link; browser opens a new tab to `/login?returnTo=<same-origin-path>` on the same domain
2. `PageLogin` broadcasts `REQUEST_AUTH` and receives `AUTH_RESPONSE` from the original tab (same as Flow 5 steps 3–4)
3. On receiving the response, `PageLogin` calls `queryClient.setQueryData([KEY_STATE_AUTH], broadcastAuth)` and sets `sameOriginRedirect`
4. On the next render, `isAuthed` is true (query cache is populated), so the component renders a declarative `<Navigate to={targetPath} replace />`; auth state and route change land in the same render batch, preventing `AuthGate` from briefly seeing `isAuthed=false` and bouncing to the home path

## Flow 7: Manage Account (from Project Domain)

Symmetric to Flow 4, in reverse: project domain (admin app) -> account app.

1. User is authenticated on project domain X (admin app)
2. User clicks "Manage Account" in the navbar
3. JWT is refreshed if needed
4. `AuthDomain` mints a handoff token from project domain X and shows a loading overlay
5. Browser is redirected to `<account domain>?auth-handoff=<token>`
6. Account domain redeems the token before rendering; auth is immediately available

> **Scope:** left-click only. Right-click "open in new tab" falls through to `/admin/login?returnTo=<account-url>` — see Flow 8 for how that's handled.

## Flow 8: Right-Click "Open in New Tab" (Cross-Origin to Account App)

Combines Flow 5's BroadcastChannel relay with Flow 7's handoff for the reverse (admin -> account) direction.

1. User right-clicks "Manage Account" in the admin navbar; browser opens a new tab to `/admin/login?returnTo=<account-url>`
2. `PageLogin` broadcasts `REQUEST_AUTH` and receives `AUTH_RESPONSE { auth }` from the original admin tab (same as Flow 5 steps 3–4), setting `broadcastAuth`
3. Since `returnTo` is cross-origin and the page is not on the auth domain, the **Continue** button is shown using `broadcastAuth` as the effective auth
4. User clicks Continue: `AuthDomain.openAccountWithAuth()` refreshes the relayed auth if needed, then transfers it to the account app via the same mint → redirect → redeem sequence as Flow 7

> If no existing tab responds to `REQUEST_AUTH` within 500 ms, `AuthDomain.handleAuth()` redirects to the auth domain and the normal login flow takes over.

## Related

- [`AuthDomain`](../src/model/service/AuthDomain/README.md): cross-domain auth service (mint/redeem handoff)
- [`AuthLink`](../src/component/AuthLink/AuthLink.tsx): `<a href>` wrapper enabling right-click new-tab on auth-gated links
- [`AuthBroadcastProvider`](../src/component/AuthBroadcastProvider/AuthBroadcastProvider.tsx): BroadcastChannel responder mounted in the account app root
- ADR: [auth-link-new-tab](decisions/2026/2026-06-07_auth-link-new-tab.md): design rationale for Flows 5 & 6
- ADR: [auth-domain-redirect-handoff](decisions/2026/2026-09-28_auth-domain-redirect-handoff.md): design rationale for the mint/redirect/redeem handoff
- ADR: [auth-domain-popup-reliability](decisions/2026/2026-05-11_auth-domain-popup-reliability.md): superseded, kept for history
