<!-- cspell:ignore useisrestoring -->

# Authentication Navigation Flows

Documents the end-to-end authentication and navigation flows used across the app. Covers how `AuthDomain`, `AuthLink`, `AuthBroadcastProvider`, and `PageLogin` cooperate to handle login, domain transfer, and right-click new-tab scenarios.

## BroadcastChannel vs. postMessage

Both mechanisms transfer auth state between browser contexts, but they apply to different relationships between windows:

|                      | Same-origin tab, no window reference      | Cross-origin (auth domain → project domain)  |
| -------------------- | ----------------------------------------- | -------------------------------------------- |
| **BroadcastChannel** | used (Flows 5 & 6)                        | not possible, channels are scoped per-origin |
| **postMessage**      | not applicable, no `window.opener` exists | used (Flows 1, 2, 4, and Flow 5 step 6)      |

A right-click "open in new tab" produces a tab with no `window.opener`, so `postMessage` cannot reach it; `AuthBroadcastProvider` answers via same-origin `BroadcastChannel` instead. Crossing to a different domain still requires the popup + `postMessage` handoff. Flow 5 uses **both**: `BroadcastChannel` for instant same-origin discovery (steps 3–5), then popup + `postMessage` for the actual cross-domain transfer (step 6).

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
3. User logs in via form submission
4. Form handler opens popup window immediately (user gesture allows popup)
5. Auth domain navigates the popup to domain X
6. `{ auth, rememberMe }` passed via `postMessage()` from auth domain to popup
7. Popup writes `{ auth, rememberMe }` to `veysur.authHandoff` localStorage key and sends `auth-complete` to opener
8. Popup closes
9. Auth domain shows loading overlay and redirects to domain X
10. Domain X `queryClient.ts` init reads and removes the handoff; auth is immediately available

## Flow 2: Already Authenticated (Authorized Domain)

1. User already authenticated on auth domain visits domain X (not authenticated there)
2. Redirected to auth domain with `returnTo` parameter
3. Auth domain detects user is already authenticated
4. Validates that domain X is in user's authorized domains (from `projectOwn`/`projectAdmin`)
5. Shows "Continue" button to user
6. User clicks "Continue" (user gesture allows popup)
7. Popup window opens to domain X
8. `{ auth, rememberMe }` passed via `postMessage()` to popup
9. Popup writes `{ auth, rememberMe }` to `veysur.authHandoff` localStorage key and sends `auth-complete` to opener
10. Popup closes
11. Auth domain shows loading overlay and redirects to domain X
12. Domain X `queryClient.ts` init reads and removes the handoff; auth is immediately available

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
3. Popup window opens immediately (user gesture allows popup)
4. JWT is refreshed if needed
5. Popup navigates to project domain X
6. `{ auth, rememberMe }` passed via `postMessage()` to popup
7. Popup writes `{ auth, rememberMe }` to `veysur.authHandoff` localStorage key and sends `auth-complete` to opener
8. Popup closes
9. Auth domain shows loading overlay and redirects to domain X
10. Domain X `queryClient.ts` init reads and removes the handoff; auth is immediately available

> **Failure path:** If `popup-ready` is never received and the user has not switched back to the auth-domain window, the fallback timer fires (throttled by background-tab rules). The popup shows an error state after 30 s with a "Close this window" button; closing it triggers `finish()` in the opener and navigates the main window to domain X (unauthenticated; user can log in normally).

## Flow 5: Right-Click "Open in New Tab" (Cross-Domain Link)

1. User right-clicks a project link in the account navbar; browser opens a new tab to `/login?returnTo=<project-url>`
2. `PageLogin` mounts with no session (new tab has empty sessionStorage)
3. `PageLogin` broadcasts `REQUEST_AUTH` on the `veysur-auth` BroadcastChannel
4. `AuthBroadcastProvider` (running in the original account-app tab) receives the message and replies with `AUTH_RESPONSE { auth }`
5. `PageLogin` in the new tab receives the response (within 500 ms), sets `broadcastAuth` state, and shows the **Continue** button immediately
6. User clicks Continue: `AuthDomain.prepareTargetWindow()` opens a popup, then `handleAuthed` transfers auth via postMessage (same as Flow 2 steps 6–11)

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
3. Popup window opens immediately (user gesture allows popup)
4. JWT is refreshed if needed
5. Popup navigates to the account domain
6. `{ auth, rememberMe }` passed via `postMessage()` to popup
7. Popup writes `{ auth, rememberMe }` to `veysur.authHandoff` localStorage key and sends `auth-complete` to opener (`AuthDomainPopup.signalAuthComplete()`, targetOrigin `'*'` since the opener's origin differs from `PUBLIC_AUTHENTICATION_DOMAIN`)
8. Popup closes
9. Project domain shows loading overlay and redirects to the account domain
10. Account domain `queryClient.ts` init reads and removes the handoff; auth is immediately available

> The popup's `readAuthMessage` accepts the incoming message if it's from `window.opener` (via `event.source === window.opener`), since `event.origin` won't match `PUBLIC_AUTHENTICATION_DOMAIN` in this direction.

> **Scope:** left-click only. Right-click "open in new tab" falls through to `/admin/login?returnTo=<account-url>` — see Flow 8 for how that's handled.

## Flow 8: Right-Click "Open in New Tab" (Cross-Origin to Account App)

Combines Flow 5's BroadcastChannel relay with Flow 7's popup transfer for the reverse (admin -> account) direction.

1. User right-clicks "Manage Account" in the admin navbar; browser opens a new tab to `/admin/login?returnTo=<account-url>`
2. `PageLogin` broadcasts `REQUEST_AUTH` and receives `AUTH_RESPONSE { auth }` from the original admin tab (same as Flow 5 steps 3–4), setting `broadcastAuth`
3. Since `returnTo` is cross-origin and the page is not on the auth domain, the **Continue** button is shown using `broadcastAuth` as the effective auth
4. User clicks Continue: `AuthDomain.openAccountWithAuth()` opens a popup, refreshing the relayed auth if needed, then transfers it to the account app via popup + `postMessage` (same as Flow 7 steps 3–10)

> If no existing tab responds to `REQUEST_AUTH` within 500 ms, `AuthDomain.handleAuth()` redirects to the auth domain and the normal login flow takes over.

## Related

- [`AuthDomain`](../src/model/service/AuthDomain/README.md): cross-domain auth service (popup orchestration, postMessage protocol)
- [`AuthLink`](../src/component/AuthLink/AuthLink.tsx): `<a href>` wrapper enabling right-click new-tab on auth-gated links
- [`AuthBroadcastProvider`](../src/component/AuthBroadcastProvider/AuthBroadcastProvider.tsx): BroadcastChannel responder mounted in the account app root
- ADR: [auth-link-new-tab](decisions/2026/2026-06-07_auth-link-new-tab.md): design rationale for Flows 5 & 6
- ADR: [auth-domain-popup-reliability](decisions/2026/2026-05-11_auth-domain-popup-reliability.md): design rationale for the popup fallback timer
